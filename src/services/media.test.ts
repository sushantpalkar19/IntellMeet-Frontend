import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMediaState, setAudioEnabled, setMediaStateChangeListener, setVideoEnabled, startMedia, stopMedia } from './media';

vi.mock('./socket', () => ({ getSocket: () => null }));

function makeTrack(kind: 'audio' | 'video') {
  return {
    id: `${kind}-${Math.random()}`,
    kind,
    enabled: true,
    readyState: 'live',
    onended: null as (() => void) | null,
    stop: vi.fn(),
  } as unknown as MediaStreamTrack;
}

function makeStream(audio = true, video = true) {
  const tracks = [
    ...(audio ? [makeTrack('audio')] : []),
    ...(video ? [makeTrack('video')] : []),
  ];
  return {
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((track) => track.kind === 'audio'),
    getVideoTracks: () => tracks.filter((track) => track.kind === 'video'),
  } as unknown as MediaStream;
}

afterEach(() => {
  stopMedia();
  setMediaStateChangeListener(null);
  vi.restoreAllMocks();
});

describe('media service', () => {
  it('captures audio and video with supported quality constraints', async () => {
    const stream = makeStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });

    await expect(startMedia()).resolves.toBe(stream);
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({
      audio: expect.objectContaining({ echoCancellation: true, noiseSuppression: true, autoGainControl: true }),
    }));
  });

  it('keeps permission failures available as a user-facing error', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });

    await expect(startMedia()).rejects.toThrow('denied');
    expect(getMediaState().error).toMatch(/permission|access denied/i);
  });

  it('retries with browser defaults when an optional audio constraint is unsupported', async () => {
    const stream = makeStream();
    const unsupported = Object.assign(new DOMException('unsupported', 'OverconstrainedError'), { constraint: 'noiseSuppression' });
    const getUserMedia = vi.fn().mockRejectedValueOnce(unsupported).mockResolvedValueOnce(stream);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });

    await expect(startMedia()).resolves.toBe(stream);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(getUserMedia).toHaveBeenLastCalledWith(expect.objectContaining({ audio: true }));
  });

  it('toggles track state, notifies consumers, and stops all tracks on cleanup', async () => {
    const stream = makeStream();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    const changed = vi.fn();
    setMediaStateChangeListener(changed);
    await startMedia();

    setAudioEnabled(false);
    setVideoEnabled(false);
    expect(stream.getAudioTracks()[0].enabled).toBe(false);
    expect(stream.getVideoTracks()[0].enabled).toBe(false);
    expect(changed).toHaveBeenCalled();

    stopMedia();
    expect(stream.getTracks().every((track) => (track.stop as ReturnType<typeof vi.fn>).mock.calls.length === 1)).toBe(true);
    expect(getMediaState().stream).toBeNull();
  });

  it('reports device track termination and updates the corresponding media state', async () => {
    const stream = makeStream();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    const changed = vi.fn();
    setMediaStateChangeListener(changed);
    await startMedia();
    const videoTrack = stream.getVideoTracks()[0] as ReturnType<typeof makeTrack>;
    Object.defineProperty(videoTrack, 'readyState', { configurable: true, value: 'ended' });
    (videoTrack.onended as unknown as (() => void))?.();

    expect(getMediaState().videoEnabled).toBe(false);
    expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ videoEnabled: false }));
  });

  it('reacquires only a disconnected camera and keeps the live microphone track', async () => {
    class TestMediaStream {
      private tracks: MediaStreamTrack[];
      constructor(tracks: MediaStreamTrack[]) { this.tracks = tracks; }
      getTracks() { return this.tracks; }
      getAudioTracks() { return this.tracks.filter((track) => track.kind === 'audio'); }
      getVideoTracks() { return this.tracks.filter((track) => track.kind === 'video'); }
    }
    vi.stubGlobal('MediaStream', TestMediaStream);
    const original = makeStream();
    const replacementStream = makeStream(false, true);
    const replacementVideo = replacementStream.getVideoTracks()[0];
    const getUserMedia = vi.fn().mockResolvedValueOnce(original).mockResolvedValueOnce(replacementStream);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    await startMedia();
    const microphone = original.getAudioTracks()[0];
    Object.defineProperty(original.getVideoTracks()[0], 'readyState', { configurable: true, value: 'ended' });
    (original.getVideoTracks()[0].onended as unknown as (() => void) | null)?.();

    const recovered = await startMedia(true, true);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(getUserMedia).toHaveBeenLastCalledWith(expect.objectContaining({ audio: false, video: expect.any(Object) }));
    expect(recovered.getAudioTracks()[0]).toBe(microphone);
    expect(recovered.getVideoTracks()[0]).toBe(replacementVideo);
  });
});
