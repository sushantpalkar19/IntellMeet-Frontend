import { getSocket } from './socket';
import { setLocalMediaStream } from './webrtc';

// Media Capture Service
// Handles camera and microphone capture with proper error handling and cleanup

export interface MediaStreamState {
  stream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  error: string | null;
}

let localStream: MediaStream | null = null;
let audioEnabled = false;
let videoEnabled = false;
let mediaError: string | null = null;
let stateChangeListener: ((state: MediaStreamState) => void) | null = null;

function notifyStateChange(): void {
  stateChangeListener?.(getMediaState());
}

function streamFromTracks(tracks: MediaStreamTrack[]): MediaStream {
  if (typeof MediaStream !== 'undefined') return new MediaStream(tracks);
  const items = [...tracks];
  return {
    getTracks: () => items,
    getAudioTracks: () => items.filter((track) => track.kind === 'audio'),
    getVideoTracks: () => items.filter((track) => track.kind === 'video'),
    addTrack: (track: MediaStreamTrack) => { if (!items.includes(track)) items.push(track); },
    removeTrack: (track: MediaStreamTrack) => { const index = items.indexOf(track); if (index >= 0) items.splice(index, 1); },
  } as unknown as MediaStream;
}

export function setMediaStateChangeListener(listener: ((state: MediaStreamState) => void) | null): void {
  stateChangeListener = listener;
}

/**
 * Get the current local media stream
 */
export function getLocalStream(): MediaStream | null {
  return localStream;
}

/**
 * Get the current media state
 */
export function getMediaState(): MediaStreamState {
  return {
    stream: localStream,
    audioEnabled,
    videoEnabled,
    error: mediaError,
  };
}

/**
 * Request camera and microphone access
 * @param video - Request video track
 * @param audio - Request audio track
 * @returns MediaStream
 * @throws Error if permission denied or device not found
 */
export async function startMedia(video: boolean = true, audio: boolean = true): Promise<MediaStream> {
  const existingLiveTracks = localStream?.getTracks().filter((track) => track.readyState === 'live') ?? [];
  const keepVideoTrack = video ? existingLiveTracks.find((track) => track.kind === 'video') : undefined;
  const keepAudioTrack = audio ? existingLiveTracks.find((track) => track.kind === 'audio') : undefined;
  const needVideo = video && !keepVideoTrack;
  const needAudio = audio && !keepAudioTrack;
  if (!needVideo && !needAudio && existingLiveTracks.every((track) => track.kind === 'video' ? video : audio)) return localStream!;

  // Stop only tracks the caller explicitly no longer wants; keep live devices while reacquiring a missing one.
  existingLiveTracks.filter((track) => track.kind === 'video' ? !video || track !== keepVideoTrack : !audio || track !== keepAudioTrack).forEach((track) => track.stop());

  try {
    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
    const constraints: MediaStreamConstraints = {
      video: needVideo ? { 
        width: { ideal: 1280 }, 
        height: { ideal: 720 } 
      } : false,
      audio: needAudio ? audioConstraints : false,
    };

    let acquiredStream: MediaStream | null = null;
    if (needVideo || needAudio) {
      try {
        acquiredStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (captureError) {
        const unsupportedAudioConstraint = captureError instanceof DOMException
          && captureError.name === 'OverconstrainedError'
          && ['echoCancellation', 'noiseSuppression', 'autoGainControl'].includes((captureError as DOMException & { constraint?: string }).constraint ?? '');
        if (!needAudio || !unsupportedAudioConstraint) throw captureError;
        acquiredStream = await navigator.mediaDevices.getUserMedia({ ...constraints, audio: true });
      }
    }
    const tracks = [keepVideoTrack, keepAudioTrack, ...(acquiredStream?.getTracks() ?? [])].filter((track): track is MediaStreamTrack => Boolean(track));
    const stream = !keepVideoTrack && !keepAudioTrack && acquiredStream ? acquiredStream : streamFromTracks(tracks);
    localStream = stream;
    audioEnabled = stream.getAudioTracks().some((track) => track.enabled && track.readyState === 'live');
    videoEnabled = stream.getVideoTracks().some((track) => track.enabled && track.readyState === 'live');
    mediaError = null;

    // Handle track ended events (device unplugged) while preserving any still-live track.
    stream.getTracks().forEach((track) => {
      track.onended = () => {
        if (!localStream?.getTracks().some((item) => item.id === track.id)) return;
        console.log('Track ended:', track.kind);
        if (track.kind === 'video') videoEnabled = false;
        if (track.kind === 'audio') audioEnabled = false;
        const liveTracks = localStream?.getTracks().filter((item) => item.readyState === 'live') ?? [];
        localStream = liveTracks.length ? streamFromTracks(liveTracks) : null;
        setLocalMediaStream(localStream);
        mediaError = track.kind === 'video' ? 'Camera disconnected. Retry camera access to reconnect.' : 'Microphone disconnected. Retry microphone access to reconnect.';
        notifyStateChange();
      };
    });

    notifyStateChange();

    return stream;
  } catch (error) {
    const err = error as Error;
    mediaError = getMediaErrorMessage(err);
    throw err;
  }
}

/**
 * Stop all media tracks and cleanup
 */
export function stopMedia(): void {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }
  audioEnabled = false;
  videoEnabled = false;
  mediaError = null;
  setLocalMediaStream(null);
  notifyStateChange();
}

/**
 * Enable or disable audio track
 * @param enabled - Whether to enable audio
 */
export function setAudioEnabled(enabled: boolean): void {
  if (!localStream) return;

  const audioTracks = localStream.getAudioTracks();
  audioTracks.forEach((track) => {
    track.enabled = enabled;
  });

  audioEnabled = enabled;
  notifyStateChange();
}

/**
 * Enable or disable video track
 * @param enabled - Whether to enable video
 */
export function setVideoEnabled(enabled: boolean): void {
  if (!localStream) return;

  const videoTracks = localStream.getVideoTracks();
  videoTracks.forEach((track) => {
    track.enabled = enabled;
  });

  videoEnabled = enabled;
  notifyStateChange();
}

/**
 * Toggle audio track
 */
export function toggleAudio(): void {
  setAudioEnabled(!audioEnabled);
}

/**
 * Toggle video track
 */
export function toggleVideo(): void {
  setVideoEnabled(!videoEnabled);
}

/**
 * Get user-friendly error message from media error
 */
function getMediaErrorMessage(error: Error): string {
  const name = error.name.toLowerCase();

  if (name.includes('permission') || name.includes('security')) {
    return 'Camera or microphone permission denied. Please allow access in your browser settings.';
  }

  if (name.includes('notfound') || name.includes('device')) {
    return 'Camera or microphone not found. Please check your device connections.';
  }

  if (name.includes('notallowed') || name.includes('denied')) {
    return 'Camera or microphone access denied. Please allow access and try again.';
  }

  if (name.includes('notreadable') || name.includes('busy')) {
    return 'Camera or microphone is already in use by another application.';
  }

  if (name.includes('overconstrained') || name.includes('constraint')) {
    return 'Camera or microphone does not support the requested settings.';
  }

  if (name.includes('typeerror') || name.includes('unsupported')) {
    return 'Camera or microphone not supported by your browser.';
  }

  return `Failed to access camera or microphone: ${error.message}`;
}

/**
 * Check if media devices are available
 */
export async function checkMediaDevices(): Promise<boolean> {
  try {
    await navigator.mediaDevices.enumerateDevices();
    return true;
  } catch {
    return false;
  }
}

/**
 * Set the local media stream to be shared with all peer connections
 * Broadcasts media state to participants
 */
export function setLocalMediaStreamForWebRTC(stream: MediaStream | null): void {
  setLocalMediaStream(stream);
}

/**
 * Broadcast media state to meeting participants
 */
export function broadcastMediaState(meetingId: string, audioEnabled: boolean, videoEnabled: boolean): void {
  const socket = getSocket();
  if (!socket?.connected) return;

  socket.emit('media:state:update', {
    meetingId,
    audioEnabled,
    videoEnabled,
  });
}

/**
 * Get available media devices
 */
export async function getMediaDevices(): Promise<MediaDeviceInfo[]> {
  try {
    return await navigator.mediaDevices.enumerateDevices();
  } catch {
    return [];
  }
}
