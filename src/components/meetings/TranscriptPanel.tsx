import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '../../services/socket';
import { meetingApi } from '../../services/meetingApi';

type Status = 'stopped' | 'running' | 'paused';
type Segment = { id: string; speakerId: string; speakerName: string; text: string; startAt: string; endAt: string; createdAt: string };
type PendingChunk = { blob: Blob; startMs: number; endMs: number; sequence: number; chunkId: string; sessionId: string; transcriptionSessionId: string };
const supportedAudioMimeTypes = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/mpeg', 'audio/flac'];

interface Props { meetingId: string; microphoneTrack: MediaStreamTrack | null; microphoneEnabled: boolean; isHost: boolean; }

const CHUNK_MS = 15000;
const retryable = (error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return !status || status === 408 || status === 429 || status >= 500;
};

export default function TranscriptPanel({ meetingId, microphoneTrack, microphoneEnabled, isHost }: Props) {
  const [status, setStatus] = useState<Status>('stopped');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [captureFailed, setCaptureFailed] = useState(false);
  const [captureAttempt, setCaptureAttempt] = useState(0);
  const [attribution, setAttribution] = useState('Speaker names identify the authenticated participant whose microphone audio was uploaded. Voice diarization is not performed.');
  const listRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<string | null>(null);
  const sourceSessionRef = useRef<string | null>(null);
  const sourceForTranscriptionRef = useRef<string | null>(null);
  const sequenceRef = useRef(0);
  const nextTranscriptPageRef = useRef(2);
  const elapsedRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const pendingChunksRef = useRef(new Map<string, PendingChunk>());
  const retryPendingRef = useRef<(() => void) | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const retryAfterRef = useRef(0);
  const mountedRef = useRef(true);

  const loadPage = useCallback(async (page = 1) => {
    if (mountedRef.current) setLoadingHistory(true);
    try {
      const data = await meetingApi.getTranscript(meetingId, page, 100);
      if (!mountedRef.current) return;
      setSegments((current) => {
        const merged = page === 1 ? [...current, ...data.segments] : [...current, ...data.segments];
        return Array.from(new Map(merged.map((segment) => [segment.id, segment])).values()).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
      });
      setHasMore(page < data.pagination.totalPages);
      nextTranscriptPageRef.current = page + 1;
      setAttribution(data.attribution);
    } catch {
      if (mountedRef.current) setError('Could not load the meeting transcript.');
    } finally {
      if (mountedRef.current) setLoadingHistory(false);
    }
  }, [meetingId]);

  useEffect(() => {
    mountedRef.current = true;
    void loadPage();
    const socket = getSocket();
    if (!socket) return () => { mountedRef.current = false; };
    const handleStatus = (data: { meetingId: string; status: Status; sessionId: string | null }) => {
      if (data.meetingId !== meetingId) return;
      setStatus(data.status);
      if (data.status === 'running' && data.sessionId) sessionRef.current = data.sessionId;
      if (data.status === 'stopped') sessionRef.current = null;
      void loadPage();
    };
    const handleError = (data: { meetingId?: string; message?: string }) => { if (!data.meetingId || data.meetingId === meetingId) setError(data.message || 'Transcription control failed.'); };
    const handleReconnect = () => retryPendingRef.current?.();
    socket.on('transcription:status', handleStatus);
    socket.on('transcription:error', handleError);
    socket.on('connect', handleReconnect);
    return () => {
      mountedRef.current = false;
      socket.off('transcription:status', handleStatus);
      socket.off('transcription:error', handleError);
      socket.off('connect', handleReconnect);
    };
  }, [meetingId, loadPage]);

  const uploadChunk = useCallback(async (blob: Blob, startMs: number, endMs: number, sequence: number, chunkId: string, sessionId: string, transcriptionSessionId: string) => {
    const key = chunkId;
    pendingChunksRef.current.set(key, { blob, startMs, endMs, sequence, chunkId, sessionId, transcriptionSessionId });
    while (pendingChunksRef.current.size > 10) {
      const oldest = pendingChunksRef.current.keys().next().value;
      if (oldest) pendingChunksRef.current.delete(oldest);
      setError('Some queued audio could not be retained while offline; transcription may have a gap.');
    }
    if (Date.now() < retryAfterRef.current) return;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const result = await meetingApi.uploadTranscriptChunk(meetingId, blob, { sessionId, transcriptionSessionId, sequence, chunkId, startMs, endMs });
        if (result.processing) throw new Error('The chunk is still being processed');
        const receivedSegments = result.segments ?? (result.segment ? [result.segment] : []);
        if (receivedSegments.length && mountedRef.current) {
          setSegments((current) => Array.from(new Map([...current, ...receivedSegments].map((item) => [item.id, item])).values()).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)));
        }
        pendingChunksRef.current.delete(key);
        return;
      } catch (err) {
        const response = (err as { response?: { status?: number; data?: { retryAfterSeconds?: number }; headers?: Record<string, string> } }).response;
        if (response?.status === 429) {
          const retryAfterSeconds = Number(response.data?.retryAfterSeconds ?? response.headers?.['retry-after']);
          const delay = Math.min(24 * 60 * 60 * 1000, Math.max(1000, Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 60000));
          retryAfterRef.current = Date.now() + delay;
          if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
          retryTimerRef.current = window.setTimeout(() => retryPendingRef.current?.(), delay);
          if (mountedRef.current) setError(`Groq free-tier limit reached. Queued audio will retry in about ${Math.ceil(delay / 1000)} seconds.`);
          return;
        }
        if (attempt === 3 || !retryable(err)) {
          if (mountedRef.current) setError('A transcript audio chunk could not be processed. It can be retried by reconnecting or resuming.');
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }, [meetingId]);

  retryPendingRef.current = () => {
    if (Date.now() < retryAfterRef.current) return;
    for (const chunk of pendingChunksRef.current.values()) {
      void uploadChunk(chunk.blob, chunk.startMs, chunk.endMs, chunk.sequence, chunk.chunkId, chunk.sessionId, chunk.transcriptionSessionId);
    }
  };

  useEffect(() => {
    if (status !== 'running' || !microphoneEnabled || !microphoneTrack || microphoneTrack.readyState !== 'live' || !sessionRef.current || typeof MediaRecorder === 'undefined') return;
    let canceled = false;
    const transcriptionSessionId = sessionRef.current;
    if (!sourceSessionRef.current || sourceForTranscriptionRef.current !== transcriptionSessionId) {
      sourceSessionRef.current = crypto.randomUUID().replace(/-/g, '');
      sourceForTranscriptionRef.current = transcriptionSessionId;
      sequenceRef.current = 0;
      elapsedRef.current = 0;
    }
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType || !supportedAudioMimeTypes.includes(mimeType.split(';')[0])) { setError('This browser cannot create a supported audio chunk format.'); return; }

    const captureNext = () => {
      if (canceled || status !== 'running' || microphoneTrack.readyState !== 'live') return;
      const stream = new MediaStream([microphoneTrack]);
      // A fresh recorder per chunk writes a complete container header/trailer;
      // arbitrary MediaRecorder timeslices are not assumed to be standalone files.
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      const started = elapsedRef.current;
      const parts: BlobPart[] = [];
      let recordingFailed = false;
      recorder.ondataavailable = (event) => { if (event.data.size) parts.push(event.data); };
      recorder.onerror = () => {
        recordingFailed = true;
        canceled = true;
        setCaptureFailed(true);
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        setError('Microphone audio recording failed. Check microphone permission and try again.');
      };
      const captureStart = performance.now();
      recorder.onstop = () => {
        const ended = started + Math.max(1, performance.now() - captureStart);
        elapsedRef.current = ended;
        const blob = new Blob(parts, { type: mimeType.split(';')[0] });
        const sessionId = sourceSessionRef.current;
        const sequence = sequenceRef.current++;
        const chunkId = sessionId ? `${sessionId}-${sequence}` : '';
        if (!recordingFailed && sessionId && blob.size && blob.size <= 2 * 1024 * 1024) void uploadChunk(blob, started, ended, sequence, chunkId, sessionId, transcriptionSessionId);
        else if (blob.size > 2 * 1024 * 1024) setError('An audio chunk exceeded the safe upload size and was discarded.');
        if (!canceled && status === 'running') timerRef.current = window.setTimeout(captureNext, 0);
      };
      recorder.start();
      timerRef.current = window.setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, CHUNK_MS);
    };
    captureNext();
    return () => {
      canceled = true;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      const recorder = recorderRef.current;
      if (recorder?.state === 'recording') recorder.stop();
    };
  }, [status, microphoneTrack, microphoneEnabled, captureAttempt, uploadChunk]);

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [segments]);

  const control = (action: 'start' | 'pause' | 'resume' | 'stop') => {
    const socket = getSocket();
    if (!socket?.connected) { setError('Connect to the meeting before changing transcription.'); return; }
    setError('');
    if (action === 'start') {
      sessionRef.current = crypto.randomUUID().replace(/-/g, '');
      sourceSessionRef.current = null;
      sourceForTranscriptionRef.current = null;
      sequenceRef.current = 0;
      elapsedRef.current = 0;
      socket.emit('transcription:start', { meetingId, sessionId: sessionRef.current });
    } else socket.emit(`transcription:${action}`, { meetingId });
  };

  const exportTxt = async () => {
    setBusy(true);
    try {
      const blob = await meetingApi.getTranscriptTextExport(meetingId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `intellmeet-transcript-${meetingId}.txt`; link.click(); URL.revokeObjectURL(url);
    } catch { setError('Transcript export failed.'); }
    finally { setBusy(false); }
  };

  const exportPdf = async () => {
    setBusy(true);
    try {
      const first = await meetingApi.getTranscript(meetingId, 1, 100);
      const allSegments = [...first.segments];
      for (let page = 2; page <= first.pagination.totalPages; page += 1) {
        const next = await meetingApi.getTranscript(meetingId, page, 100);
        allSegments.push(...next.segments);
      }
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      pdf.setFontSize(16);
      pdf.text('IntellMeet Meeting Transcript', 14, 18);
      pdf.setFontSize(9);
      pdf.text('Speaker labels identify authenticated microphone upload sources, not voice diarization.', 14, 25);
      let y = 36;
      for (const segment of allSegments) {
        const time = new Date(segment.startAt).toLocaleString();
        const lines = pdf.splitTextToSize(`${time} — ${segment.speakerName}: ${segment.text}`, 180);
        if (y + lines.length * 5 > 282) { pdf.addPage(); y = 18; }
        pdf.text(lines, 14, y);
        y += lines.length * 5 + 4;
      }
      pdf.save(`intellmeet-transcript-${meetingId}.pdf`);
    } catch { setError('Transcript PDF export failed.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="flex min-h-64 max-h-[42vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#151622] text-slate-100 print:max-h-none print:overflow-visible">
      <header className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div><h2 className="text-sm font-semibold">Transcript</h2><p className="mt-0.5 text-xs text-slate-400">{status === 'running' ? 'Live transcription on' : status === 'paused' ? 'Transcription paused' : 'Transcription off'}</p></div>
        {status === 'running' && <span className="flex items-center gap-1.5 text-xs text-emerald-300"><i className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Recording</span>}
      </header>
      {status === 'running' && <p role="status" className="border-b border-emerald-500/20 bg-emerald-950/30 px-4 py-2 text-[11px] leading-4 text-emerald-200">Transcription is active. Each participant’s microphone audio is being sent securely for speech-to-text processing.</p>}
      {status === 'running' && (!microphoneEnabled || !microphoneTrack || microphoneTrack.readyState !== 'live') && <p role="status" className="border-b border-amber-500/20 bg-amber-950/30 px-4 py-2 text-[11px] leading-4 text-amber-200">Turn on your microphone and allow browser permission to contribute your speech to the transcript.</p>}
      <div ref={listRef} aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {hasMore && <button type="button" disabled={loadingHistory} onClick={() => void loadPage(nextTranscriptPageRef.current)} className="w-full py-2 text-xs text-violet-300 disabled:opacity-50">{loadingHistory ? 'Loading…' : 'Load more transcript'}</button>}
        {!segments.length && <p className="py-4 text-center text-xs text-slate-400">Transcript segments will appear here.</p>}
        {segments.map((segment) => <article key={segment.id} className="text-sm"><div className="mb-1 flex items-baseline justify-between gap-2"><span className="font-medium text-violet-200">{segment.speakerName}</span><time className="text-[11px] text-slate-500">{new Date(segment.startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div><p className="leading-relaxed text-slate-200">{segment.text}</p></article>)}
      </div>
      <footer className="border-t border-white/10 px-4 py-3">
        <p className="mb-2 text-[10px] leading-4 text-slate-500">{attribution}</p>
        {error && <p role="alert" className="mb-2 text-xs text-rose-300">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {status === 'running' && captureFailed && microphoneEnabled && <button type="button" onClick={() => { setCaptureFailed(false); setCaptureAttempt((attempt) => attempt + 1); }} className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold hover:bg-amber-600">Retry microphone capture</button>}
          {isHost && status === 'stopped' && <button type="button" onClick={() => control('start')} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold hover:bg-violet-500">Start transcription</button>}
          {isHost && status === 'running' && <button type="button" onClick={() => control('pause')} className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-600">Pause</button>}
          {isHost && status === 'paused' && <button type="button" onClick={() => control('resume')} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold hover:bg-violet-500">Resume</button>}
          {isHost && status !== 'stopped' && <button type="button" onClick={() => control('stop')} className="rounded-lg bg-rose-900/70 px-3 py-1.5 text-xs font-semibold hover:bg-rose-800">Stop</button>}
          <button type="button" disabled={busy} onClick={() => void exportTxt()} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5">Export TXT</button>
          <button type="button" disabled={busy} onClick={() => void exportPdf()} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5 disabled:opacity-50">Export PDF</button>
        </div>
      </footer>
    </section>
  );
}
