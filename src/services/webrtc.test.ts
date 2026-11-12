import { afterEach, describe, expect, it, vi } from 'vitest';
import { closeAllPeerConnections, createPeerConnection, handleOffer, setLocalMediaStream, setWebRTCLocalUserId } from './webrtc';

const { socket } = vi.hoisted(() => ({ socket: { connected: true, emit: vi.fn() } }));
vi.mock('./socket', () => ({ getSocket: () => socket }));

class FakePeerConnection {
  static instances: FakePeerConnection[] = [];
  onicecandidate: ((event: { candidate: RTCIceCandidate | null }) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  ontrack: ((event: { track: MediaStreamTrack }) => void) | null = null;
  onnegotiationneeded: (() => Promise<void>) | null = null;
  signalingState: RTCSignalingState = 'stable';
  connectionState: RTCPeerConnectionState = 'new';
  iceConnectionState: RTCIceConnectionState = 'new';
  remoteDescription: RTCSessionDescription | null = null;
  localDescription: RTCSessionDescription | null = null;
  senders: RTCRtpSender[] = [];
  rollbackCount = 0;
  restartIce = vi.fn(() => { void this.onnegotiationneeded?.(); });

  constructor() { FakePeerConnection.instances.push(this); }
  addTrack(track: MediaStreamTrack) {
    const sender: { track: MediaStreamTrack | null; replaceTrack: ReturnType<typeof vi.fn> } = {
      track,
      replaceTrack: vi.fn(async (next: MediaStreamTrack | null) => { sender.track = next; }),
    };
    this.senders.push(sender as unknown as RTCRtpSender);
    return sender as unknown as RTCRtpSender;
  }
  removeTrack(sender: RTCRtpSender) { this.senders = this.senders.filter((item) => item !== sender); }
  getSenders() { return this.senders; }
  async setLocalDescription(description?: RTCSessionDescriptionInit) {
    if (description?.type === 'rollback') {
      this.rollbackCount += 1;
      this.localDescription = null;
      this.signalingState = 'stable';
      return;
    }
    const type = description?.type ?? (this.signalingState === 'have-remote-offer' ? 'answer' : 'offer');
    this.localDescription = { type, sdp: `${type}-sdp` } as RTCSessionDescription;
    this.signalingState = type === 'offer' ? 'have-local-offer' : 'stable';
  }
  async setRemoteDescription(description: RTCSessionDescriptionInit) {
    this.remoteDescription = description as RTCSessionDescription;
    this.signalingState = description.type === 'offer' ? 'have-remote-offer' : 'stable';
  }
  async createAnswer() { return { type: 'answer', sdp: 'answer-sdp' } as RTCSessionDescriptionInit; }
  async createOffer() { return { type: 'offer', sdp: 'offer-sdp' } as RTCSessionDescriptionInit; }
  async addIceCandidate() {}
  close() { this.connectionState = 'closed'; }
}

function track(id: string, kind: 'audio' | 'video' = 'audio') {
  return { id, kind } as MediaStreamTrack;
}

function stream(...tracks: MediaStreamTrack[]) {
  return { getTracks: () => tracks } as unknown as MediaStream;
}

afterEach(() => {
  closeAllPeerConnections();
  setLocalMediaStream(null);
  setWebRTCLocalUserId('');
  FakePeerConnection.instances = [];
  socket.emit.mockClear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('WebRTC peer management', () => {
  it('attaches existing local tracks to new connections and prevents duplicate senders', () => {
    vi.stubGlobal('RTCPeerConnection', FakePeerConnection);
    const camera = track('camera', 'video');
    setLocalMediaStream(stream(camera));
    const pc = createPeerConnection('peer', 'meeting');

    setLocalMediaStream(stream(camera));
    expect((pc as unknown as FakePeerConnection).getSenders()).toHaveLength(1);
  });

  it('attaches newly captured tracks to already connected peers', () => {
    vi.stubGlobal('RTCPeerConnection', FakePeerConnection);
    const pc = createPeerConnection('peer', 'meeting') as unknown as FakePeerConnection;
    setLocalMediaStream(stream(track('microphone')));

    expect(pc.getSenders().map((sender) => sender.track?.id)).toEqual(['microphone']);
  });

  it('replaces only the outgoing video track and preserves the microphone sender', async () => {
    vi.stubGlobal('RTCPeerConnection', FakePeerConnection);
    const camera = track('camera', 'video');
    const mic = track('mic', 'audio');
    setLocalMediaStream(stream(camera, mic));
    const pc = createPeerConnection('peer', 'meeting') as unknown as FakePeerConnection;
    const screen = track('screen', 'video');
    const { replaceLocalVideoTrack } = await import('./webrtc');

    await replaceLocalVideoTrack(screen, stream(screen));
    expect(pc.getSenders().filter((sender) => sender.track?.kind === 'video').map((sender) => sender.track?.id)).toEqual(['screen']);
    expect(pc.getSenders().filter((sender) => sender.track?.kind === 'audio').map((sender) => sender.track?.id)).toEqual(['mic']);

    await replaceLocalVideoTrack(camera, stream(camera), false);
    expect(pc.getSenders().filter((sender) => sender.track?.kind === 'video').map((sender) => sender.track?.id)).toEqual(['camera']);
  });

  it('sends an offer when negotiationneeded fires for a new or updated track', async () => {
    vi.stubGlobal('RTCPeerConnection', FakePeerConnection);
    setWebRTCLocalUserId('user-a');
    setLocalMediaStream(stream(track('camera', 'video')));
    const pc = createPeerConnection('user-b', 'meeting') as unknown as FakePeerConnection;

    await pc.onnegotiationneeded?.();
    expect(socket.emit).toHaveBeenCalledWith('webrtc:offer', expect.objectContaining({ targetUserId: 'user-b' }));
  });

  it('rolls back a colliding local offer on the polite peer', async () => {
    vi.stubGlobal('RTCPeerConnection', FakePeerConnection);
    setWebRTCLocalUserId('z-user');
    const pc = createPeerConnection('a-user', 'meeting') as unknown as FakePeerConnection;
    pc.signalingState = 'have-local-offer';
    pc.localDescription = { type: 'offer', sdp: 'local' } as RTCSessionDescription;

    await handleOffer('a-user', 'meeting', { type: 'offer', sdp: 'remote' });
    expect(pc.rollbackCount).toBe(1);
    expect(socket.emit).toHaveBeenCalledWith('webrtc:answer', expect.objectContaining({ targetUserId: 'a-user' }));
  });

  it('requests ICE restart after ICE failure and retains the peer connection', async () => {
    vi.stubGlobal('RTCPeerConnection', FakePeerConnection);
    const pc = createPeerConnection('peer', 'meeting') as unknown as FakePeerConnection;
    pc.iceConnectionState = 'failed';
    pc.oniceconnectionstatechange?.();
    await vi.waitFor(() => expect(pc.restartIce).toHaveBeenCalledTimes(1));
    expect(pc.connectionState).not.toBe('closed');
    expect(FakePeerConnection.instances).toHaveLength(1);
  });

  it('replaces a peer transport after bounded ICE restart failures', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('RTCPeerConnection', FakePeerConnection);
    const pc = createPeerConnection('peer', 'meeting') as unknown as FakePeerConnection;
    pc.connectionState = 'failed';
    pc.onconnectionstatechange?.();
    await vi.advanceTimersByTimeAsync(8000);
    await vi.advanceTimersByTimeAsync(8000);
    expect(FakePeerConnection.instances).toHaveLength(2);
    expect(FakePeerConnection.instances[1].connectionState).toBe('new');
  });

  it('ignores a colliding offer on the impolite peer', async () => {
    vi.stubGlobal('RTCPeerConnection', FakePeerConnection);
    setWebRTCLocalUserId('a-user');
    const pc = createPeerConnection('z-user', 'meeting') as unknown as FakePeerConnection;
    pc.signalingState = 'have-local-offer';
    pc.localDescription = { type: 'offer', sdp: 'local' } as RTCSessionDescription;

    await handleOffer('z-user', 'meeting', { type: 'offer', sdp: 'remote' });
    expect(pc.rollbackCount).toBe(0);
    expect(pc.remoteDescription).toBeNull();
  });
});
