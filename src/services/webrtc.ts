import { getSocket } from './socket';

// WebRTC configuration
export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

// Default STUN servers (public, no credentials needed)
const DEFAULT_STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

/**
 * Parse TURN server from environment
 * SECURITY WARNING: VITE_ variables are embedded in the frontend bundle and are public.
 * For production, use a secure backend endpoint to generate short-lived TURN credentials.
 * Do not commit real TURN credentials to version control.
 */
const parseTurnServer = (): RTCIceServer[] => {
  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (!turnUrl || !turnUsername || !turnCredential) {
    return [];
  }

  return [
    {
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    },
  ];
};

// Get WebRTC configuration
export const getWebRTCConfig = (): WebRTCConfig => {
  const turnServers = parseTurnServer();
  return {
    iceServers: [...DEFAULT_STUN_SERVERS, ...turnServers],
  };
};

// Peer connection context to store meetingId and ICE candidate queue
interface PeerConnectionContext {
  pc: RTCPeerConnection;
  meetingId: string;
  iceCandidateQueue: RTCIceCandidateInit[];
  makingOffer: boolean;
  ignoreOffer: boolean;
  isSettingRemoteAnswerPending: boolean;
  polite: boolean;
  localStream: MediaStream | null; // Local media stream for this peer
  iceRestartAttempts: number;
  iceRestartPending: boolean;
  recoveryTimer: ReturnType<typeof setTimeout> | null;
}

// WebRTC peer connection map (peerUserId -> PeerConnectionContext)
const peerConnections = new Map<string, PeerConnectionContext>();

// Local media stream (shared across all peer connections)
let localMediaStream: MediaStream | null = null;
let localUserId = '';
let outgoingVideoOverride: { track: MediaStreamTrack; stream: MediaStream } | null = null;

export function setWebRTCLocalUserId(userId: string): void {
  localUserId = userId;
}

// Callback types
export type TrackCallback = (peerUserId: string, track: MediaStreamTrack) => void;
export type ConnectionStateCallback = (peerUserId: string, state: RTCPeerConnectionState) => void;
export type IceStateCallback = (peerUserId: string, state: RTCIceConnectionState) => void;

// Callbacks
let onTrack: TrackCallback | null = null;
let onConnectionStateChange: ConnectionStateCallback | null = null;
let onIceStateChange: IceStateCallback | null = null;
const MAX_ICE_RESTART_ATTEMPTS = 2;

function requestIceRestart(peerUserId: string, context: PeerConnectionContext): void {
  if (context.pc.signalingState === 'closed' || context.iceRestartPending) return;
  if (context.iceRestartAttempts >= MAX_ICE_RESTART_ATTEMPTS) {
    const meetingId = context.meetingId;
    closePeerConnection(peerUserId);
    // Replace the failed transport once; the normal negotiation path and authorization remain in use.
    createPeerConnection(peerUserId, meetingId);
    return;
  }

  context.iceRestartAttempts += 1;
  context.iceRestartPending = true;
  try {
    context.pc.restartIce();
  } catch (error) {
    context.iceRestartPending = false;
    console.error('Failed to request ICE restart:', error);
    return;
  }

  context.recoveryTimer = setTimeout(() => {
    context.recoveryTimer = null;
    if (peerConnections.get(peerUserId) !== context || context.pc.connectionState === 'connected') return;
    context.iceRestartPending = false;
    requestIceRestart(peerUserId, context);
  }, 8000);
}

/**
 * Set callbacks for WebRTC events
 */
export function setWebRTCCallbacks(
  trackCallback?: TrackCallback,
  connectionStateCallback?: ConnectionStateCallback,
  iceStateCallback?: IceStateCallback,
) {
  onTrack = trackCallback || null;
  onConnectionStateChange = connectionStateCallback || null;
  onIceStateChange = iceStateCallback || null;
}

/**
 * Create a peer connection for a specific user
 * Returns existing connection if already exists for this peer
 */
export function createPeerConnection(peerUserId: string, meetingId: string): RTCPeerConnection {
  // Return existing connection if already exists
  const existing = peerConnections.get(peerUserId);
  if (existing) {
    return existing.pc;
  }

  const config = getWebRTCConfig();
  const pc = new RTCPeerConnection(config);

  const context: PeerConnectionContext = {
    pc,
    meetingId,
    iceCandidateQueue: [],
    makingOffer: false,
    ignoreOffer: false,
    isSettingRemoteAnswerPending: false,
    polite: localUserId.localeCompare(peerUserId) > 0,
    localStream: null,
    iceRestartAttempts: 0,
    iceRestartPending: false,
    recoveryTimer: null,
  };

  // Attach local media stream if available
  if (localMediaStream) {
    localMediaStream.getTracks().filter((track) => track.kind !== 'video' || !outgoingVideoOverride).forEach((track) => {
      pc.addTrack(track, localMediaStream!);
    });
    context.localStream = localMediaStream;
  }
  if (outgoingVideoOverride) pc.addTrack(outgoingVideoOverride.track, outgoingVideoOverride.stream);

  // Handle ICE candidates
  pc.onicecandidate = (event) => {
    if (peerConnections.get(peerUserId) !== context) return;
    if (event.candidate) {
      sendIceCandidate(peerUserId, meetingId, event.candidate);
    }
  };

  pc.onnegotiationneeded = async () => {
    if (peerConnections.get(peerUserId) !== context) return;
    if (context.makingOffer || pc.signalingState !== 'stable') return;
    try {
      context.makingOffer = true;
      await pc.setLocalDescription();
      if (pc.localDescription) sendOffer(peerUserId, meetingId, pc.localDescription);
    } catch (error) {
      console.error('Error negotiating with peer:', error);
    } finally {
      context.makingOffer = false;
    }
  };

  // Handle connection state changes
  pc.onconnectionstatechange = () => {
    if (peerConnections.get(peerUserId) !== context) return;
    if (onConnectionStateChange) {
      onConnectionStateChange(peerUserId, pc.connectionState);
    }

    if (pc.connectionState === 'connected') {
      context.iceRestartAttempts = 0;
      context.iceRestartPending = false;
      if (context.recoveryTimer) clearTimeout(context.recoveryTimer);
      context.recoveryTimer = null;
    } else if (pc.connectionState === 'disconnected') {
      if (!context.recoveryTimer) context.recoveryTimer = setTimeout(() => {
        context.recoveryTimer = null;
        if (pc.connectionState === 'disconnected') requestIceRestart(peerUserId, context);
      }, 4000);
    } else if (pc.connectionState === 'failed') {
      requestIceRestart(peerUserId, context);
    } else if (pc.connectionState === 'closed') {
      closePeerConnection(peerUserId);
    }
  };

  // Handle ICE connection state changes
  pc.oniceconnectionstatechange = () => {
    if (peerConnections.get(peerUserId) !== context) return;
    if (onIceStateChange) {
      onIceStateChange(peerUserId, pc.iceConnectionState);
    }

    if (pc.iceConnectionState === 'failed') requestIceRestart(peerUserId, context);
    else if (pc.iceConnectionState === 'disconnected' && !context.recoveryTimer) {
      context.recoveryTimer = setTimeout(() => {
        context.recoveryTimer = null;
        if (pc.iceConnectionState === 'disconnected') requestIceRestart(peerUserId, context);
      }, 4000);
    }
  };

  // Handle remote tracks
  pc.ontrack = (event) => {
    if (peerConnections.get(peerUserId) !== context) return;
    if (onTrack) {
      onTrack(peerUserId, event.track);
    }
  };

  // Store the peer connection context
  peerConnections.set(peerUserId, context);

  return pc;
}

/**
 * Get a peer connection for a specific user
 */
export function getPeerConnection(peerUserId: string): RTCPeerConnection | undefined {
  return peerConnections.get(peerUserId)?.pc;
}

/**
 * Get peer connection context
 */
function getPeerContext(peerUserId: string): PeerConnectionContext | undefined {
  return peerConnections.get(peerUserId);
}

/**
 * Close a peer connection for a specific user
 * Safe to call multiple times
 */
export function closePeerConnection(peerUserId: string): void {
  const context = peerConnections.get(peerUserId);
  if (context) {
    if (context.recoveryTimer) clearTimeout(context.recoveryTimer);
    context.pc.close();
    context.iceCandidateQueue = [];
    context.localStream = null;
    peerConnections.delete(peerUserId);
  }
}

/**
 * Close all peer connections
 */
export function closeAllPeerConnections(): void {
  peerConnections.forEach((context) => {
    if (context.recoveryTimer) clearTimeout(context.recoveryTimer);
    context.pc.close();
    context.iceCandidateQueue = [];
    context.localStream = null;
  });
  peerConnections.clear();
}

/**
 * Set the local media stream to be shared with all peer connections
 * Attaches tracks to existing peer connections and triggers renegotiation
 */
export function setLocalMediaStream(stream: MediaStream | null): void {
  localMediaStream = stream;

  // Attach tracks to all existing peer connections and trigger renegotiation
  peerConnections.forEach((context) => {
    const nextTracks = stream?.getTracks().filter((track) => track.kind !== 'video' || !outgoingVideoOverride) ?? [];
    for (const kind of ['audio', 'video'] as const) {
      if (kind === 'video' && outgoingVideoOverride) continue;
      const track = nextTracks.find((item) => item.kind === kind) ?? null;
      const senders = context.pc.getSenders().filter((sender) => sender.track?.kind === kind);
      if (senders[0]) void senders[0].replaceTrack(track);
      else if (track && stream) context.pc.addTrack(track, stream);
      senders.slice(1).forEach((sender) => context.pc.removeTrack(sender));
    }

    context.localStream = stream;

  });
}

/** Replace only the outgoing video track, keeping the microphone sender and peer connections intact. */
export async function replaceLocalVideoTrack(track: MediaStreamTrack | null, stream?: MediaStream, override = true): Promise<void> {
  outgoingVideoOverride = override && track && stream ? { track, stream } : null;
  const operations: Promise<void>[] = [];
  peerConnections.forEach((context) => {
    const videoSenders = context.pc.getSenders().filter((sender) => sender.track?.kind === 'video');
    const sender = videoSenders[0];
    if (sender) {
      operations.push(sender.replaceTrack(track));
      // Retire any duplicate video senders if an older session created them.
      videoSenders.slice(1).forEach((duplicate) => context.pc.removeTrack(duplicate));
    } else if (track && stream) {
      context.pc.addTrack(track, stream);
    }
  });
  await Promise.all(operations);
}

/**
 * Get the local media stream
 */
export function getLocalMediaStream(): MediaStream | null {
  return localMediaStream;
}

/**
 * Apply queued ICE candidates after remote description is set
 */
function applyQueuedIceCandidates(peerUserId: string): void {
  const context = getPeerContext(peerUserId);
  if (!context) return;

  const queue = context.iceCandidateQueue;
  context.iceCandidateQueue = [];

  queue.forEach(async (candidate) => {
    try {
      await context.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error applying queued ICE candidate:', error);
    }
  });
}

/**
 * Create and send an offer to a peer
 * This is the polite peer initiating the connection
 */
export async function createOffer(_peerUserId: string, meetingId: string): Promise<void> {
  createPeerConnection(_peerUserId, meetingId);
}

/**
 * Handle an incoming offer from a peer
 * Implements polite peer pattern with deterministic role-based resolution
 * The peer who initiates the connection (calls createOffer) is the "polite" peer
 * The peer who receives the offer is the "impolite" peer
 * Impolite peer always accepts incoming offers and replaces local description
 */
export async function handleOffer(fromUserId: string, meetingId: string, offer: RTCSessionDescriptionInit): Promise<void> {
  if (!getPeerContext(fromUserId)) createPeerConnection(fromUserId, meetingId);
  const context = getPeerContext(fromUserId)!;
  const pc = context.pc;

  try {
    const readyForOffer = !context.makingOffer && (pc.signalingState === 'stable' || context.isSettingRemoteAnswerPending);
    const offerCollision = offer.type === 'offer' && !readyForOffer;
    context.ignoreOffer = !context.polite && offerCollision;
    if (context.ignoreOffer) return;
    if (offerCollision && context.polite) await pc.setLocalDescription({ type: 'rollback' });
    await pc.setRemoteDescription(offer);
    applyQueuedIceCandidates(fromUserId);
    if (offer.type === 'offer') {
      await pc.setLocalDescription();
      if (pc.localDescription) sendAnswer(fromUserId, meetingId, pc.localDescription);
    }
  } catch (error) {
    console.error('Error handling offer:', error);
    throw error;
  }
}

/**
 * Handle an incoming answer from a peer
 */
export async function handleAnswer(fromUserId: string, answer: RTCSessionDescriptionInit): Promise<void> {
  const context = getPeerContext(fromUserId);
  if (!context) {
    console.error('No peer connection found for user:', fromUserId);
    return;
  }

  try {
    context.isSettingRemoteAnswerPending = true;
    await context.pc.setRemoteDescription(new RTCSessionDescription(answer));
    context.isSettingRemoteAnswerPending = false;

    // Apply queued ICE candidates
    applyQueuedIceCandidates(fromUserId);
  } catch (error) {
    context.isSettingRemoteAnswerPending = false;
    console.error('Error handling answer:', error);
    throw error;
  }
}

/**
 * Handle an incoming ICE candidate from a peer
 * Buffers candidates if remote description is not yet set
 */
export async function handleIceCandidate(fromUserId: string, candidate: RTCIceCandidateInit): Promise<void> {
  const context = getPeerContext(fromUserId);
  if (!context) {
    console.error('No peer connection found for user:', fromUserId);
    return;
  }

  // Buffer candidate if remote description is not set
  if (!context.pc.remoteDescription) {
    context.iceCandidateQueue.push(candidate);
    return;
  }

  try {
    await context.pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    if (context.ignoreOffer) return;
    console.error('Error handling ICE candidate:', error);
    // Silently ignore invalid candidates (may be for already-set remote description)
  }
}

/**
 * Send an offer via Socket.IO
 */
function sendOffer(targetUserId: string, meetingId: string, offer: RTCSessionDescriptionInit): void {
  const socket = getSocket();
  if (!socket?.connected) {
    console.error('Socket not connected');
    return;
  }

  socket.emit('webrtc:offer', {
    meetingId,
    targetUserId,
    offer,
  });
}

/**
 * Send an answer via Socket.IO
 */
function sendAnswer(targetUserId: string, meetingId: string, answer: RTCSessionDescriptionInit): void {
  const socket = getSocket();
  if (!socket?.connected) {
    console.error('Socket not connected');
    return;
  }

  socket.emit('webrtc:answer', {
    meetingId,
    targetUserId,
    answer,
  });
}

/**
 * Send an ICE candidate via Socket.IO
 * Includes meetingId for backend validation
 */
function sendIceCandidate(targetUserId: string, meetingId: string, candidate: RTCIceCandidateInit): void {
  const socket = getSocket();
  if (!socket?.connected) {
    console.error('Socket not connected');
    return;
  }

  socket.emit('webrtc:ice-candidate', {
    meetingId,
    targetUserId,
    candidate,
  });
}

/**
 * Send a leave signal via Socket.IO
 */
export function sendLeaveSignal(targetUserId: string, meetingId: string): void {
  const socket = getSocket();
  if (!socket?.connected) {
    console.error('Socket not connected');
    return;
  }

  socket.emit('webrtc:leave', {
    meetingId,
    targetUserId,
  });
}

/**
 * Handle a leave signal from a peer
 */
export function handleLeave(fromUserId: string): void {
  closePeerConnection(fromUserId);
}

// Named listener functions for proper cleanup
const webrtcOfferListener = (data: { meetingId: string; fromUserId: string; offer: RTCSessionDescriptionInit }) => {
  const currentMeetingId = currentMeetingIdRef.current;
  if (data.meetingId === currentMeetingId) {
    handleOffer(data.fromUserId, data.meetingId, data.offer);
  }
};

const webrtcAnswerListener = (data: { meetingId: string; fromUserId: string; answer: RTCSessionDescriptionInit }) => {
  const currentMeetingId = currentMeetingIdRef.current;
  if (data.meetingId === currentMeetingId) {
    handleAnswer(data.fromUserId, data.answer);
  }
};

const webrtcIceCandidateListener = (data: { meetingId: string; fromUserId: string; candidate: RTCIceCandidateInit }) => {
  const currentMeetingId = currentMeetingIdRef.current;
  if (data.meetingId === currentMeetingId) {
    handleIceCandidate(data.fromUserId, data.candidate);
  }
};

const webrtcLeaveListener = (data: { meetingId: string; fromUserId: string }) => {
  const currentMeetingId = currentMeetingIdRef.current;
  if (data.meetingId === currentMeetingId) {
    handleLeave(data.fromUserId);
  }
};

// Ref to track current meeting ID for listener filtering
const currentMeetingIdRef = { current: '' };

/**
 * Setup WebRTC socket event listeners
 * Idempotent - safe to call multiple times
 */
export function setupWebRTCListeners(meetingId: string): void {
  const socket = getSocket();
  if (!socket) return;

  // Update current meeting ID
  currentMeetingIdRef.current = meetingId;

  // Remove existing listeners to prevent duplicates (idempotent)
  socket.off('webrtc:offer', webrtcOfferListener);
  socket.off('webrtc:answer', webrtcAnswerListener);
  socket.off('webrtc:ice-candidate', webrtcIceCandidateListener);
  socket.off('webrtc:leave', webrtcLeaveListener);

  // Add listeners
  socket.on('webrtc:offer', webrtcOfferListener);
  socket.on('webrtc:answer', webrtcAnswerListener);
  socket.on('webrtc:ice-candidate', webrtcIceCandidateListener);
  socket.on('webrtc:leave', webrtcLeaveListener);
}

/**
 * Cleanup WebRTC socket event listeners
 * Removes only WebRTC-specific listeners, not chat or other listeners
 */
export function cleanupWebRTCListeners(): void {
  const socket = getSocket();
  if (!socket) return;

  socket.off('webrtc:offer', webrtcOfferListener);
  socket.off('webrtc:answer', webrtcAnswerListener);
  socket.off('webrtc:ice-candidate', webrtcIceCandidateListener);
  socket.off('webrtc:leave', webrtcLeaveListener);

  currentMeetingIdRef.current = '';
}

/**
 * Handle socket reconnection
 * Closes all peer connections to avoid stale connections after reconnection
 */
export function handleSocketReconnection(): void {
  console.log('Socket reconnected, closing all peer connections to avoid stale connections');
  closeAllPeerConnections();
}
