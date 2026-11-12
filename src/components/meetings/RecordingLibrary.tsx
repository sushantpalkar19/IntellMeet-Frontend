import { useCallback, useEffect, useState } from 'react';
import { meetingApi } from '../../services/meetingApi';
import type { MeetingRecording } from '../../services/meetingApi';
import { useAuthStore } from '../../stores/authStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
type TranscriptLine = { id: string; speakerName: string; text: string; startAt: string; endAt: string };
export default function RecordingLibrary({ workspaceId }: { workspaceId: string }) {
  const { user } = useAuthStore();
  const [recordings, setRecordings] = useState<MeetingRecording[]>([]);
  const [selected, setSelected] = useState<MeetingRecording | null>(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [currentLineId, setCurrentLineId] = useState('');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { const result = await meetingApi.listRecordings(workspaceId); setRecordings(result.recordings); }
    catch { setError('Could not load recordings for this workspace.'); }
  }, [workspaceId]);
  useEffect(() => { void load(); }, [load]);

  const play = async (recording: MeetingRecording) => {
    setBusyId(recording.id); setError('');
    try {
      const ticket = await meetingApi.getRecordingPlaybackTicket(recording.id);
      setSelected(recording); setStreamUrl(new URL(ticket.streamUrl, API_BASE).toString()); setDownloadUrl(new URL(ticket.downloadUrl, API_BASE).toString());
      const first = await meetingApi.getTranscript(recording.meetingId, 1, 100); const segments = [...first.segments];
      for (let page = 2; page <= first.pagination.totalPages; page += 1) segments.push(...(await meetingApi.getTranscript(recording.meetingId, page, 100)).segments);
      setLines(segments.map((segment) => ({ id: segment.id, speakerName: segment.speakerName, text: segment.text, startAt: segment.startAt, endAt: segment.endAt }))); setCurrentLineId('');
    } catch { setError('Playback is unavailable or you do not have permission to access this recording.'); }
    finally { setBusyId(''); }
  };
  const remove = async (recording: MeetingRecording) => {
    if (!window.confirm(`Delete the recording of “${recording.meetingTitle}”? This cannot be undone.`)) return;
    setBusyId(recording.id); setError('');
    try { await meetingApi.deleteRecording(recording.id); if (selected?.id === recording.id) { setSelected(null); setStreamUrl(''); setDownloadUrl(''); setLines([]); } await load(); }
    catch { setError('Could not delete this recording. Only its host or a workspace owner/admin can delete it.'); }
    finally { setBusyId(''); }
  };
  const formatDuration = (milliseconds: number) => { const seconds = Math.floor(milliseconds / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; };

  return <section aria-label="Meeting recordings" className="rounded-2xl border border-purple-100/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#151522] sm:p-6">
    <header className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900 dark:text-white">Meeting recordings</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Private recordings captured by the meeting host’s browser.</p></div><button type="button" onClick={() => void load()} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-white/15">Refresh</button></header>
    {error && <p role="alert" className="mb-3 rounded-lg bg-red-950/30 p-2 text-xs text-red-200">{error}</p>}
    {recordings.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">No recordings in this workspace yet.</p> : <div className="grid gap-3">{recordings.map((recording) => <article key={recording.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 dark:border-white/10 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{recording.meetingTitle || 'Meeting'}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{new Date(recording.createdAt).toLocaleString()} · {formatDuration(recording.durationMs)} · {recording.format}</p><p className="mt-1 text-[11px] capitalize text-slate-400">{recording.status.replaceAll('_', ' ')}</p></div><div className="flex gap-2">{['completed', 'interrupted'].includes(recording.status) && <><button type="button" disabled={busyId === recording.id} onClick={() => void play(recording)} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busyId === recording.id ? 'Loading…' : 'Play'}</button>{recording.hostId === user?.id && <button type="button" disabled={busyId === recording.id} onClick={() => void remove(recording)} className="rounded-lg border border-red-400/30 px-3 py-2 text-xs text-red-300 disabled:opacity-50">Delete</button>}</>}</div></article>)}</div>}
    {selected && streamUrl && <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 dark:border-white/10 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]"><div><div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">{selected.meetingTitle}</h3><div className="flex gap-2"><a href={downloadUrl} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-white/15">Download</a><button type="button" onClick={() => { setSelected(null); setStreamUrl(''); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-white/15">Close</button></div></div><video data-recording-player src={streamUrl} controls preload="metadata" onTimeUpdate={(event) => { const time = event.currentTarget.currentTime; const line = lines.filter((item) => selected.startedAt && new Date(item.startAt).getTime() - new Date(selected.startedAt).getTime() <= time * 1000).at(-1); setCurrentLineId(line?.id || ''); }} className="aspect-video w-full rounded-xl bg-black" /><p className="mt-1 text-[11px] text-slate-500">Transcript synchronization is approximate because transcription and recording can start at different times.</p></div><aside className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 p-3 dark:border-white/10"><h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Transcript</h4>{lines.length ? lines.map((line) => <button key={line.id} type="button" onClick={() => { const player = document.querySelector('[data-recording-player]') as HTMLVideoElement | null; if (player && selected.startedAt) player.currentTime = Math.max(0, (new Date(line.startAt).getTime() - new Date(selected.startedAt).getTime()) / 1000); }} className={`mb-2 block w-full rounded-lg p-2 text-left text-xs ${line.id === currentLineId ? 'bg-violet-500/15 text-violet-200' : 'text-slate-300 hover:bg-white/5'}`}><span className="font-semibold">{line.speakerName}</span><span className="ml-2 text-slate-500">{new Date(line.startAt).toLocaleTimeString()}</span><span className="mt-1 block">{line.text}</span></button>) : <p className="text-xs text-slate-500">No saved transcript is available.</p>}</aside></div>}
  </section>;
}
