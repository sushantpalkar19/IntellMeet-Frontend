import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { socketState, webrtcState } = vi.hoisted(() => ({
  socketState: { socket: null as null | { connected: boolean; on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn>; emit: ReturnType<typeof vi.fn> } },
  webrtcState: { onTrack: null as null | ((peerId: string, track: MediaStreamTrack) => void), closePeerConnection: vi.fn(), closeAllPeerConnections: vi.fn() },
}));

vi.mock('../services/socket', () => ({ getSocket: () => socketState.socket }));
vi.mock('../services/webrtc', () => ({
  setupWebRTCListeners: vi.fn(),
  cleanupWebRTCListeners: vi.fn(),
  closeAllPeerConnections: webrtcState.closeAllPeerConnections,
  closePeerConnection: webrtcState.closePeerConnection,
  createOffer: vi.fn(),
  setLocalMediaStream: vi.fn(),
  setWebRTCCallbacks: vi.fn((onTrack: typeof webrtcState.onTrack) => { webrtcState.onTrack = onTrack; }),
  setWebRTCLocalUserId: vi.fn(),
}));

import { useMeetingStore } from './meetingStore';

describe('meeting store media and lifecycle', () => {
  let listeners: Map<string, (...args: never[]) => void>;

  beforeEach(() => {
    listeners = new Map();
    socketState.socket = {
      connected: true,
      on: vi.fn((event: string, listener: (...args: never[]) => void) => listeners.set(event, listener)),
      off: vi.fn((event: string) => listeners.delete(event)),
      emit: vi.fn(),
    };
    useMeetingStore.setState({
      currentMeeting: { id: 'meeting-1' } as never,
      isInRoom: false,
      isJoining: false,
      joinError: null,
      participants: new Map(),
      remoteStreams: new Map(),
      participantAudioEnabled: new Map(),
      participantVideoEnabled: new Map(),
    });
  });

  afterEach(() => {
    useMeetingStore.getState().leaveRoom();
    socketState.socket = null;
    webrtcState.onTrack = null;
  });

  it('stores remote tracks and synchronized participant media state', async () => {
    class TestMediaStream {
      tracks: MediaStreamTrack[] = [];
      addTrack(track: MediaStreamTrack) { this.tracks.push(track); }
    }
    vi.stubGlobal('MediaStream', TestMediaStream);
    await useMeetingStore.getState().joinRoom('meeting-1');
    const track = { kind: 'video' } as MediaStreamTrack;
    webrtcState.onTrack?.('peer-1', track);
    expect((useMeetingStore.getState().remoteStreams.get('peer-1') as unknown as TestMediaStream).tracks).toContain(track);

    listeners.get('participant:media:state')?.({
      meetingId: 'meeting-1', userId: 'peer-1', audioEnabled: false, videoEnabled: true,
      user: { firstName: 'A', lastName: 'B', email: 'a@example.com' },
    } as never);
    expect(useMeetingStore.getState().participantAudioEnabled.get('peer-1')).toBe(false);
    expect(useMeetingStore.getState().participantVideoEnabled.get('peer-1')).toBe(true);
  });

  it('cleans peer streams and media indicators when a participant leaves', async () => {
    await useMeetingStore.getState().joinRoom('meeting-1');
    useMeetingStore.setState({
      participants: new Map([['peer-1', { userId: 'peer-1', firstName: 'A', lastName: 'B', email: 'a@example.com', joinedAt: '' }]]),
      remoteStreams: new Map([['peer-1', {} as MediaStream]]),
      participantAudioEnabled: new Map([['peer-1', true]]),
      participantVideoEnabled: new Map([['peer-1', true]]),
    });
    listeners.get('participant:left')?.({ meetingId: 'meeting-1', userId: 'peer-1' } as never);

    const state = useMeetingStore.getState();
    expect(state.participants.has('peer-1')).toBe(false);
    expect(state.remoteStreams.has('peer-1')).toBe(false);
    expect(state.participantAudioEnabled.has('peer-1')).toBe(false);
    expect(state.participantVideoEnabled.has('peer-1')).toBe(false);
    expect(webrtcState.closePeerConnection).toHaveBeenCalledWith('peer-1');
  });

  it('synchronizes active presenter state and clears it when sharing stops', async () => {
    await useMeetingStore.getState().joinRoom('meeting-1');
    listeners.get('screenshare:started')?.({ meetingId: 'meeting-1', userId: 'peer-1', user: { firstName: 'Sam', lastName: 'Lee' } } as never);
    expect(useMeetingStore.getState().screenShare).toEqual({ userId: 'peer-1', userName: 'Sam Lee' });
    listeners.get('screenshare:stopped')?.({ meetingId: 'meeting-1', userId: 'peer-1' } as never);
    expect(useMeetingStore.getState().screenShare).toBeNull();
  });

  it('does not duplicate a room join while joining and restores once after reconnect', async () => {
    await useMeetingStore.getState().joinRoom('meeting-1');
    await useMeetingStore.getState().joinRoom('meeting-1');
    expect(socketState.socket?.emit).toHaveBeenCalledTimes(1);
    useMeetingStore.setState({ isInRoom: true, isJoining: false });

    useMeetingStore.getState().restoreRoom();
    expect(socketState.socket?.emit).toHaveBeenCalledTimes(2);
    expect(socketState.socket?.emit).toHaveBeenLastCalledWith('meeting:join', { meetingId: 'meeting-1' });
    expect(listeners.size).toBe(8);
  });

  it('leaves the meeting room without requesting a meeting-wide end', async () => {
    await useMeetingStore.getState().joinRoom('meeting-1');
    useMeetingStore.setState({ isInRoom: true });
    useMeetingStore.getState().leaveRoom();
    expect(socketState.socket?.emit).toHaveBeenCalledWith('meeting:leave', { meetingId: 'meeting-1' });
    expect(socketState.socket?.emit).not.toHaveBeenCalledWith('meeting:end', expect.anything());
  });

  it('cleans listeners, peer connections, local tracks, and state when leaving the meeting', async () => {
    await useMeetingStore.getState().joinRoom('meeting-1');
    useMeetingStore.setState({ isInRoom: true, remoteStreams: new Map([['peer-1', {} as MediaStream]]) });
    useMeetingStore.getState().leaveRoom();

    expect(socketState.socket?.emit).toHaveBeenCalledWith('meeting:leave', { meetingId: 'meeting-1' });
    expect(webrtcState.closeAllPeerConnections).toHaveBeenCalled();
    expect(useMeetingStore.getState().remoteStreams.size).toBe(0);
    expect(useMeetingStore.getState().participantAudioEnabled.size).toBe(0);
    expect(listeners.size).toBe(0);
  });
});
