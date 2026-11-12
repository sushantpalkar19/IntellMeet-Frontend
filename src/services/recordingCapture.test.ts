import { afterEach, describe, expect, it, vi } from 'vitest';
import { MeetingRecordingCapture } from './recordingCapture';

class FakeStream {
  tracks: any[];
  constructor(tracks: any[] = []) { this.tracks = [...tracks]; }
  getTracks() { return this.tracks; }
  getAudioTracks() { return this.tracks.filter((track) => track.kind === 'audio'); }
  getVideoTracks() { return this.tracks.filter((track) => track.kind === 'video'); }
  addTrack(track: any) { this.tracks.push(track); }
}
class FakeRecorder {
  static instance: FakeRecorder;
  static isTypeSupported = vi.fn(() => true);
  stream: FakeStream;
  options: MediaRecorderOptions;
  state = 'inactive'; ondataavailable: ((event: { data: Blob }) => void) | null = null; onerror: (() => void) | null = null;
  private stopListeners: Array<() => void> = [];
  constructor(stream: FakeStream, options: MediaRecorderOptions) { this.stream = stream; this.options = options; FakeRecorder.instance = this; }
  start() { this.state = 'recording'; }
  pause() { this.state = 'paused'; }
  resume() { this.state = 'recording'; }
  addEventListener(name: string, callback: () => void) { if (name === 'stop') this.stopListeners.push(callback); }
  stop() { this.ondataavailable?.({ data: new Blob(['recorded bytes'], { type: 'video/webm' }) }); this.state = 'inactive'; this.stopListeners.forEach((listener) => listener()); }
}

afterEach(() => { Reflect.deleteProperty(HTMLCanvasElement.prototype, 'captureStream'); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('MeetingRecordingCapture', () => {
  it('records a host-side composite, pauses/resumes, and flushes ordered chunks on stop', async () => {
    const videoTrack = { id: 'video-1', kind: 'video', readyState: 'live', stop: vi.fn() };
    const audioTrack = { id: 'audio-1', kind: 'audio', readyState: 'live', stop: vi.fn() };
    const destinationTrack = { id: 'mixed-audio', kind: 'audio', readyState: 'live', stop: vi.fn() };
    const output = new FakeStream([videoTrack]);
    const destination = new FakeStream([destinationTrack]);
    const audioNode = { connect: vi.fn(), disconnect: vi.fn() };
    const audioContext = { createMediaStreamDestination: () => ({ stream: destination }), createMediaStreamSource: vi.fn(() => audioNode), resume: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) };
    vi.stubGlobal('MediaStream', FakeStream);
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    vi.stubGlobal('AudioContext', class { constructor() { return audioContext as any; } });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillStyle: '', font: '', fillRect: vi.fn(), fillText: vi.fn(), drawImage: vi.fn() } as any);
    Object.defineProperty(HTMLCanvasElement.prototype, 'captureStream', { configurable: true, value: vi.fn(() => output) });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const uploaded = vi.fn().mockResolvedValue(undefined); const onError = vi.fn();
    const capture = new MeetingRecordingCapture(uploaded, { onError });
    const source = new FakeStream([videoTrack, audioTrack]);
    await capture.start([{ id: 'speaker-1', name: 'Speaker', stream: source as any }]);
    expect(FakeRecorder.instance.options.mimeType).toContain('video/webm');
    expect(audioContext.createMediaStreamSource).toHaveBeenCalledTimes(1);
    capture.pause(); expect(FakeRecorder.instance.state).toBe('paused');
    capture.resume(); expect(FakeRecorder.instance.state).toBe('recording');
    await capture.stopAndFlush();
    expect(uploaded).toHaveBeenCalledWith(expect.any(Blob), 0, expect.any(Number), expect.any(Number));
    expect(videoTrack.stop).toHaveBeenCalled(); expect(destinationTrack.stop).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
