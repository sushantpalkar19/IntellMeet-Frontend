export type RecordingSource = { id: string; name: string; stream: MediaStream };
type UploadChunk = (blob: Blob, sequence: number, startMs: number, endMs: number) => Promise<void>;
type CaptureCallbacks = { onError: (message: string) => void };

/** Host-browser compositor: records only tracks the host browser currently receives. */
export class MeetingRecordingCapture {
  private canvas = document.createElement('canvas');
  private context = this.canvas.getContext('2d');
  private outputStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private audioDestination: MediaStreamAudioDestinationNode | null = null;
  private audioSources = new Map<string, MediaStreamAudioSourceNode>();
  private videos = new Map<string, { element: HTMLVideoElement; source: RecordingSource }>();
  private recorder: MediaRecorder | null = null;
  private drawTimer: number | null = null;
  private queue: Promise<void> = Promise.resolve();
  private sequence = 0;
  private startTime = 0;
  private lastChunkEnd = 0;
  private activeSince = 0;
  private recordedMs = 0;
  private failure: Error | null = null;
  private upload: UploadChunk;
  private callbacks: CaptureCallbacks;

  constructor(upload: UploadChunk, callbacks: CaptureCallbacks) {
    this.upload = upload;
    this.callbacks = callbacks;
    this.canvas.width = 1280; this.canvas.height = 720;
  }

  async start(sources: RecordingSource[]): Promise<void> {
    if (!this.context || typeof MediaRecorder === 'undefined' || !this.canvas.captureStream) throw new Error('This browser does not support meeting recording.');
    if (!sources.length) throw new Error('Enable a camera, microphone, screen share, or remote participant media before recording.');
    this.audioContext = new AudioContext();
    this.audioDestination = this.audioContext.createMediaStreamDestination();
    this.outputStream = this.canvas.captureStream(15);
    this.outputStream.addTrack(this.audioDestination.stream.getAudioTracks()[0]);
    this.updateSources(sources);
    await this.audioContext.resume();
    this.draw();
    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw new Error('This browser does not support a compatible recording format.');
    this.recorder = new MediaRecorder(this.outputStream, { mimeType, videoBitsPerSecond: 900_000, audioBitsPerSecond: 96_000 });
    this.recorder.onerror = () => { this.failure = new Error('Browser media recording failed.'); this.callbacks.onError(this.failure.message); };
    this.recorder.ondataavailable = (event) => {
      if (!event.data.size) return;
      const current = this.recordedMs + (this.activeSince ? performance.now() - this.activeSince : 0);
      const start = this.lastChunkEnd; const end = Math.max(start + 1, current); this.lastChunkEnd = end;
      const sequence = this.sequence++;
      this.queue = this.queue.then(async () => {
        if (event.data.size > 2 * 1024 * 1024) throw new Error('A recording segment exceeded the 2 MB upload limit.');
        await this.upload(event.data, sequence, Math.floor(start), Math.ceil(end));
      }).catch((error: unknown) => { this.failure = error as Error; this.callbacks.onError(this.failure.message || 'A recording segment could not be uploaded.'); });
    };
    this.startTime = performance.now(); this.activeSince = this.startTime; this.recorder.start(4000);
  }

  updateSources(sources: RecordingSource[]): void {
    if (!this.audioContext || !this.audioDestination) return;
    const next = new Map(sources.map((source) => [source.id, source]));
    for (const [id, value] of this.videos) if (!next.has(id) || next.get(id)?.stream !== value.source.stream) { value.element.pause(); value.element.srcObject = null; this.videos.delete(id); }
    for (const [id, source] of next) {
      if (!this.videos.has(id)) {
        const element = document.createElement('video'); element.muted = true; element.playsInline = true; element.autoplay = true; element.srcObject = source.stream; void element.play().catch(() => undefined);
        this.videos.set(id, { element, source });
      } else this.videos.get(id)!.source = source;
    }
    for (const [trackId, node] of this.audioSources) {
      const stillPresent = sources.some((source) => source.stream.getAudioTracks().some((track) => track.id === trackId && track.readyState === 'live'));
      if (!stillPresent) { node.disconnect(); this.audioSources.delete(trackId); }
    }
    for (const source of sources) for (const track of source.stream.getAudioTracks()) {
      if (track.readyState === 'live' && !this.audioSources.has(track.id)) {
        const node = this.audioContext.createMediaStreamSource(new MediaStream([track])); node.connect(this.audioDestination); this.audioSources.set(track.id, node);
      }
    }
  }

  pause(): void { if (this.recorder?.state === 'recording') { this.recordedMs += performance.now() - this.activeSince; this.activeSince = 0; this.recorder.pause(); } }
  resume(): void { if (this.recorder?.state === 'paused') { this.activeSince = performance.now(); this.recorder.resume(); } }

  async stopAndFlush(): Promise<void> {
    const recorder = this.recorder;
    if (recorder && recorder.state !== 'inactive') await new Promise<void>((resolve) => { recorder.addEventListener('stop', () => resolve(), { once: true }); recorder.stop(); });
    await this.queue;
    this.dispose();
    if (this.failure) throw this.failure;
  }

  dispose(): void {
    if (this.drawTimer !== null) window.clearInterval(this.drawTimer);
    this.drawTimer = null;
    this.videos.forEach(({ element }) => { element.pause(); element.srcObject = null; }); this.videos.clear();
    this.audioSources.forEach((node) => node.disconnect()); this.audioSources.clear();
    this.outputStream?.getTracks().forEach((track) => track.stop()); this.outputStream = null;
    void this.audioContext?.close(); this.audioContext = null; this.audioDestination = null; this.recorder = null;
  }

  private draw(): void {
    if (!this.context) return;
    const ctx = this.context; const width = this.canvas.width; const height = this.canvas.height;
    const paint = () => {
      ctx.fillStyle = '#090a10'; ctx.fillRect(0, 0, width, height);
      const entries = [...this.videos.entries()];
      if (!entries.length) { ctx.fillStyle = '#cbd5e1'; ctx.font = '24px sans-serif'; ctx.fillText('Waiting for participant media', 36, 54); return; }
      const columns = Math.ceil(Math.sqrt(entries.length)); const rows = Math.ceil(entries.length / columns); const gap = 8;
      const tileWidth = (width - gap * (columns + 1)) / columns; const tileHeight = (height - gap * (rows + 1)) / rows;
      entries.forEach(([, source], index) => {
        const x = gap + (index % columns) * (tileWidth + gap); const y = gap + Math.floor(index / columns) * (tileHeight + gap);
        const video = source.element;
        ctx.fillStyle = '#202130'; ctx.fillRect(x, y, tileWidth, tileHeight);
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
          const scale = Math.max(tileWidth / video.videoWidth, tileHeight / video.videoHeight);
          const cropWidth = tileWidth / scale; const cropHeight = tileHeight / scale;
          ctx.drawImage(video, (video.videoWidth - cropWidth) / 2, (video.videoHeight - cropHeight) / 2, cropWidth, cropHeight, x, y, tileWidth, tileHeight);
        }
        ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x, y + tileHeight - 38, tileWidth, 38);
        ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif'; ctx.fillText(source.source.name.slice(0, 64), x + 12, y + tileHeight - 14);
      });
    };
    paint(); this.drawTimer = window.setInterval(paint, 1000 / 15);
  }
}
