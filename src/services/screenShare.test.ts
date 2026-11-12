import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { replaceLocalVideoTrack } = vi.hoisted(() => ({ replaceLocalVideoTrack: vi.fn(async () => {}) }));
vi.mock('./webrtc', () => ({ replaceLocalVideoTrack }));

import { getDisplayStream, startScreenCapture, stopScreenCapture } from './screenShare';

function makeTrack(kind = 'video') {
  return { kind, readyState: 'live', stop: vi.fn() } as unknown as MediaStreamTrack;
}

describe('screen capture lifecycle', () => {
  const displayTrack = makeTrack();
  const displayStream = {
    getVideoTracks: () => [displayTrack],
    getTracks: () => [displayTrack],
  } as unknown as MediaStream;

  beforeEach(() => {
    replaceLocalVideoTrack.mockClear();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getDisplayMedia: vi.fn().mockResolvedValue(displayStream) } });
  });
  afterEach(async () => {
    await stopScreenCapture(null);
    vi.restoreAllMocks();
  });

  it('captures display media and replaces the outgoing video track', async () => {
    await expect(startScreenCapture()).resolves.toBe(displayStream);
    expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledWith({ video: true, audio: false });
    expect(replaceLocalVideoTrack).toHaveBeenCalledWith(displayTrack, displayStream);
    expect(getDisplayStream()).toBe(displayStream);
  });

  it('propagates permission denial without leaving an active display stream', async () => {
    const denial = Object.assign(new Error('denied'), { name: 'NotAllowedError' });
    vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValueOnce(denial);
    await expect(startScreenCapture()).rejects.toMatchObject({ name: 'NotAllowedError' });
    expect(getDisplayStream()).toBeNull();
  });

  it('restores the camera track and stops display tracks', async () => {
    const camera = makeTrack();
    await startScreenCapture();
    await stopScreenCapture({ getVideoTracks: () => [camera] } as unknown as MediaStream);
    expect(replaceLocalVideoTrack).toHaveBeenLastCalledWith(camera, expect.anything(), false);
    expect((displayTrack as unknown as { stop: ReturnType<typeof vi.fn> }).stop).toHaveBeenCalled();
    expect(getDisplayStream()).toBeNull();
  });
});
