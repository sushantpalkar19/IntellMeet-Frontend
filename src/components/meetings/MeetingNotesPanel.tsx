import { useCallback, useEffect, useMemo, useState } from 'react';
import { meetingApi } from '../../services/meetingApi';
import type { MeetingActionItem, MeetingSummary } from '../../services/meetingApi';

type Props = { meetingId: string; meetingTitle: string };
type Speaker = { id: string; name: string };
export default function MeetingNotesPanel({ meetingId, meetingTitle }: Props) {
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [items, setItems] = useState<MeetingActionItem[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [summaryResult, itemsResult, first] = await Promise.all([meetingApi.getMeetingSummary(meetingId), meetingApi.getMeetingActionItems(meetingId), meetingApi.getTranscript(meetingId, 1, 100)]);
      setSummary(summaryResult.summary); setItems(itemsResult.actionItems);
      const segments = [...first.segments];
      for (let page = 2; page <= first.pagination.totalPages; page += 1) segments.push(...(await meetingApi.getTranscript(meetingId, page, 100)).segments);
      const distinct = new Map<string, Speaker>();
      segments.forEach((segment) => distinct.set(segment.speakerId, { id: segment.speakerId, name: segment.speakerName }));
      setSpeakers([...distinct.values()]);
    } catch { setError('Could not load AI meeting notes. Please try again.'); }
    finally { setLoading(false); }
  }, [meetingId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (summary?.generationStatus !== 'processing') return;
    const timer = window.setInterval(() => {
      void Promise.all([meetingApi.getMeetingSummary(meetingId), meetingApi.getMeetingActionItems(meetingId)]).then(([nextSummary, nextItems]) => {
        setSummary(nextSummary.summary); setItems(nextItems.actionItems);
      }).catch(() => setError('Could not refresh generation status.'));
    }, 2500);
    return () => window.clearInterval(timer);
  }, [meetingId, summary?.generationStatus]);

  const runGeneration = async (regenerate: boolean) => {
    setGenerating(true); setError(''); setNotice('');
    try { const result = await meetingApi.generateMeetingSummary(meetingId, regenerate); setSummary(result.summary); const itemResult = await meetingApi.getMeetingActionItems(meetingId); setItems(itemResult.actionItems); setNotice('Meeting notes are ready.'); }
    catch (e: any) { setError(e?.response?.data?.message || 'Summary generation failed. You can retry.'); }
    finally { setGenerating(false); }
  };
  const updateItem = async (item: MeetingActionItem, input: { assigneeId?: string | null; dueDate?: string | null }) => {
    try { const result = await meetingApi.updateMeetingActionItem(meetingId, item.id, input); setItems((current) => current.map((x) => x.id === item.id ? result.actionItem : x)); }
    catch (e: any) { setError(e?.response?.data?.message || 'Could not update action item.'); }
  };
  const updateStatus = async (item: MeetingActionItem, status: MeetingActionItem['status']) => {
    try { const result = await meetingApi.updateMeetingActionItemStatus(meetingId, item.id, status); setItems((current) => current.map((x) => x.id === item.id ? result.actionItem : x)); }
    catch { setError('Could not update action item status.'); }
  };
  const exportPdf = async () => {
    if (!summary) return;
    try {
      const { jsPDF } = await import('jspdf'); const pdf = new jsPDF(); const width = 180; let y = 18;
      const write = (text: string, size = 10, bold = false) => { pdf.setFontSize(size); pdf.setFont('helvetica', bold ? 'bold' : 'normal'); const lines = pdf.splitTextToSize(text, width); if (y + lines.length * 5 > 280) { pdf.addPage(); y = 18; } pdf.text(lines, 15, y); y += lines.length * 5 + 3; };
      write(meetingTitle, 18, true); write(`Meeting report • ${new Date(summary.meetingDate).toLocaleString()}`, 9); write('Overview', 13, true); write(summary.overview);
      write('Detailed summary', 13, true); write(summary.detailedSummary);
      for (const [label, values] of [['Discussion points', summary.discussionPoints], ['Decisions', summary.decisions], ['Key takeaways', summary.keyTakeaways], ['Unresolved questions', summary.unresolvedQuestions]] as [string, string[]][]) { write(label, 13, true); values.forEach((value) => write(`• ${value}`)); }
      write('Action items', 13, true); items.forEach((item) => write(`• ${item.taskDescription} | ${item.assigneeName || 'Unassigned'} | ${item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No due date'} | ${item.status}`));
      pdf.save(`intellmeet-meeting-report-${meetingId}.pdf`); setNotice('PDF report downloaded.');
    } catch { setError('PDF export failed.'); }
  };
  const statusClasses = useMemo(() => ({ PENDING: 'text-amber-300', IN_PROGRESS: 'text-sky-300', COMPLETED: 'text-emerald-300' }), []);

  return <section aria-label="AI Notes" className="flex max-h-[50vh] min-h-60 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#151622] text-slate-100">
    <header className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3"><div><h2 className="text-sm font-semibold">AI meeting notes</h2><p className="mt-0.5 text-xs text-slate-400">Grounded in the saved transcript · speaker labels use authenticated upload attribution, not voice diarization</p></div>{summary && <button type="button" onClick={() => void exportPdf()} className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs hover:bg-white/5">Export PDF</button>}</header>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
      {error && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-950/30 p-2 text-xs text-red-200">{error}</p>}{notice && <p role="status" className="text-xs text-emerald-300">{notice}</p>}
      {loading ? <p className="text-sm text-slate-400">Loading meeting notes…</p> : !summary ? <div className="py-3 text-center"><p className="text-sm text-slate-300">Create a concise summary and action items from the persisted meeting transcript.</p><button type="button" disabled={generating} onClick={() => void runGeneration(false)} className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold disabled:opacity-50">{generating ? 'Generating…' : 'Generate Summary'}</button></div> : <>
        <p className="text-xs text-slate-400">{summary.meetingTitle || meetingTitle} · {new Date(summary.meetingDate).toLocaleString()}</p>
        {summary.generationStatus === 'processing' && <p role="status" className="text-xs text-violet-300">Generating notes…</p>}
        {summary.generationStatus === 'failed' && <p role="alert" className="text-xs text-amber-200">The last generation failed. Existing notes are preserved.</p>}
        <div><h3 className="text-xs font-semibold uppercase tracking-wide text-violet-300">Overview</h3><p className="mt-1 text-sm leading-6 text-slate-200">{summary.overview || 'No overview available.'}</p></div>
        {summary.detailedSummary && <div><h3 className="text-xs font-semibold uppercase tracking-wide text-violet-300">Detailed summary</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-300">{summary.detailedSummary}</p></div>}
        {([['Discussion points', summary.discussionPoints], ['Decisions', summary.decisions], ['Key takeaways', summary.keyTakeaways], ['Unresolved questions', summary.unresolvedQuestions]] as [string, string[]][]).map(([label, values]) => values.length > 0 && <div key={label}><h3 className="text-xs font-semibold uppercase tracking-wide text-violet-300">{label}</h3><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-300">{values.map((value, i) => <li key={`${label}-${i}`}>{value}</li>)}</ul></div>)}
        <div><h3 className="text-xs font-semibold uppercase tracking-wide text-violet-300">Action items</h3>{items.length === 0 ? <p className="mt-2 text-sm text-slate-400">No supported action items were found.</p> : <div className="mt-2 space-y-2">{items.map((item) => <article key={item.id} className="rounded-xl border border-white/10 bg-white/[.025] p-3"><p className="text-sm font-medium">{item.taskDescription}</p><p className="mt-1 text-xs text-slate-400">Evidence: “{item.evidence}”</p><div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3"><label className="text-[11px] text-slate-400">Assignee<select aria-label={`Assignee for ${item.taskDescription}`} value={item.assigneeId || ''} onChange={(e) => void updateItem(item, { assigneeId: e.target.value || null })} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#202130] p-2 text-xs text-slate-100"><option value="">Unassigned</option>{speakers.map((speaker) => <option key={speaker.id} value={speaker.id}>{speaker.name}</option>)}</select></label><label className="text-[11px] text-slate-400">Due date<input aria-label={`Due date for ${item.taskDescription}`} type="date" value={item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : ''} onChange={(e) => void updateItem(item, { dueDate: e.target.value || null })} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#202130] p-2 text-xs text-slate-100" /></label><label className="text-[11px] text-slate-400">Status<select aria-label={`Status for ${item.taskDescription}`} value={item.status} onChange={(e) => void updateStatus(item, e.target.value as MeetingActionItem['status'])} className={`mt-1 block w-full rounded-lg border border-white/10 bg-[#202130] p-2 text-xs ${statusClasses[item.status]}`}><option value="PENDING">Pending</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option></select></label></div></article>)}</div>}</div>
        <button type="button" disabled={generating} onClick={() => void runGeneration(true)} className="rounded-lg border border-violet-400/30 px-3 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-500/10 disabled:opacity-50">{generating ? 'Generating…' : 'Regenerate summary'}</button>
      </>}
    </div>
  </section>;
}
