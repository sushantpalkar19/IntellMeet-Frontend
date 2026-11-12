import { useEffect, useMemo, useState } from 'react';
import DashboardNavbar from '../components/layout/DashboardNavbar';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { analyticsApi } from '../services/analyticsApi';
import type { AiAnalytics, AnalyticsFilters, MeetingAnalytics, OverviewAnalytics, TaskAnalytics, WorkspaceAnalytics } from '../services/analyticsApi';

function dateOffset(days: number) { const date = new Date(); date.setDate(date.getDate() - days); return date.toISOString().slice(0, 10); }
function durationLabel(ms: number | null) { if (ms === null) return 'N/A'; const minutes = Math.round(ms / 60000); if (minutes < 60) return `${minutes} min`; return `${Math.floor(minutes / 60)}h ${minutes % 60}m`; }
function formatPeriod(value: string) { if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); return value; }

function BarChart({ title, rows, labelKey = '_id', valueKey = 'count', empty = 'No data for this range.' }: { title: string; rows: Array<Record<string, any>>; labelKey?: string; valueKey?: string; empty?: string }) {
  const max = Math.max(1, ...rows.map((row) => Number(row[valueKey] || 0)));
  return <section className="rounded-2xl border border-purple-100/70 bg-white p-5 shadow-sm dark:border-purple-900/30 dark:bg-[#151522]" aria-label={title}>
    <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
    {!rows.length ? <p className="py-12 text-center text-sm text-slate-500">{empty}</p> : <div className="mt-5 overflow-x-auto"><svg role="img" aria-label={`${title} chart`} viewBox={`0 0 ${Math.max(360, rows.length * 62)} 190`} className="h-48 min-w-full">
      {rows.map((row, index) => { const barHeight = Math.max(2, Number(row[valueKey] || 0) / max * 132); const x = index * 62 + 12; const label = String(row[labelKey] ?? ''); return <g key={`${label}-${index}`}><title>{`${label}: ${row[valueKey]}`}</title><rect x={x} y={150 - barHeight} width="34" height={barHeight} rx="5" fill="#8B5CF6"/><text x={x + 17} y="172" textAnchor="middle" fill="currentColor" className="fill-slate-500 text-[9px]">{formatPeriod(label).slice(0, 12)}</text><text x={x + 17} y={145 - barHeight} textAnchor="middle" fill="currentColor" className="fill-slate-700 text-[9px] dark:fill-slate-200">{row[valueKey]}</text></g>; })}
      <line x1="4" y1="151" x2={Math.max(360, rows.length * 62) - 4} y2="151" stroke="#64748B" strokeOpacity=".25" />
    </svg></div>}
  </section>;
}

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <article className="rounded-2xl border border-purple-100/70 bg-white p-5 shadow-sm dark:border-purple-900/30 dark:bg-[#151522]"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>{hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}</article>;
}

type Data = { overview: OverviewAnalytics; meetings: MeetingAnalytics; tasks: TaskAnalytics; ai: AiAnalytics; workspaces: WorkspaceAnalytics };
export default function Analytics() {
  const { workspaces, fetchWorkspaces } = useWorkspaceStore();
  const [filters, setFilters] = useState<AnalyticsFilters>({ from: dateOffset(29), to: new Date().toISOString().slice(0, 10), groupBy: 'day' });
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { void fetchWorkspaces(); }, [fetchWorkspaces]);
  useEffect(() => {
    let alive = true; setLoading(true); setError('');
    Promise.all([analyticsApi.getOverview(filters), analyticsApi.getMeetings(filters), analyticsApi.getTasks(filters), analyticsApi.getAi(filters), analyticsApi.getWorkspaces(filters)])
      .then(([overview, meetings, tasks, ai, workspaceData]) => { if (alive) setData({ overview, meetings, tasks, ai, workspaces: workspaceData }); })
      .catch(() => { if (alive) setError('Analytics could not be loaded. Check your access and try again.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [filters]);
  const meetingTrend = useMemo(() => data?.meetings.activity || [], [data]);
  const changeFilter = (key: keyof AnalyticsFilters, value: string) => setFilters((current) => ({ ...current, [key]: value || undefined } as AnalyticsFilters));
  const exportPdf = async () => {
    if (!data) return;
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF(); const workspaceName = filters.workspaceId ? workspaces.find((workspace) => workspace.id === filters.workspaceId)?.name || 'Selected workspace' : 'All accessible workspaces';
      doc.setFontSize(18); doc.text('IntellMeet Analytics Report', 14, 18); doc.setFontSize(10); doc.text(`Period: ${filters.from} to ${filters.to}`, 14, 27); doc.text(`Workspace: ${workspaceName}`, 14, 33);
      doc.setFontSize(13); doc.text('Meeting KPIs', 14, 45); doc.setFontSize(10);
      const meetingDuration = data.overview.meetings.durationSampleCount ? durationLabel(data.overview.meetings.totalDurationMs) : 'N/A';
      const meetingLines = [`Total meetings: ${data.overview.meetings.total}`, `Completed: ${data.overview.meetings.completed}`, `Live: ${data.overview.meetings.live}`, `Upcoming: ${data.overview.meetings.upcoming}`, `Cancelled: ${data.overview.meetings.cancelled}`, `Attendance records: ${data.overview.attendanceRecords}`, `Completed-meeting duration: ${meetingDuration}`, `Average duration: ${durationLabel(data.overview.meetings.averageDurationMs)}`];
      meetingLines.forEach((line, i) => doc.text(line, 14, 53 + i * 6));
      const y = 53 + meetingLines.length * 6 + 5; doc.setFontSize(13); doc.text('Tasks and AI usage', 14, y); doc.setFontSize(10);
      [`Tasks: ${data.tasks.total} (To Do ${data.tasks.todo}, In Progress ${data.tasks.inProgress}, Done ${data.tasks.completed})`, `Task completion: ${data.tasks.completionPercent === null ? 'N/A' : `${data.tasks.completionPercent}%`}`, `Transcript segments: ${data.ai.transcriptSegments}`, `AI summaries: ${data.ai.summariesGenerated}`, `Meeting action items: ${data.ai.actionItems}`, `Completed recordings: ${data.ai.recordings}`].forEach((line, i) => doc.text(line, 14, y + 8 + i * 6));
      doc.addPage(); doc.setFontSize(14); doc.text('Meeting activity trend', 14, 18); doc.setFontSize(10);
      let cursorY = 27;
      meetingTrend.forEach((row) => { if (cursorY > 280) { doc.addPage(); cursorY = 18; } doc.text(`${row._id}: ${row.count} meetings`, 14, cursorY); cursorY += 6; });
      doc.save('intellmeet-analytics.pdf'); setError('');
    } catch { setError('Could not export the analytics report. Please retry.'); }
  };
  const overview = data?.overview;
  const kpis = overview ? [
    ['Total meetings', overview.meetings.total], ['Completed meetings', overview.meetings.completed], ['Live meetings', overview.meetings.live], ['Upcoming meetings', overview.meetings.upcoming],
    ['Total meeting duration', overview.meetings.durationSampleCount ? durationLabel(overview.meetings.totalDurationMs) : 'N/A'], ['Average duration', durationLabel(overview.meetings.averageDurationMs)], ['Attendance records', overview.attendanceRecords], ['AI summaries', data.ai.summariesGenerated],
    ['Project tasks', overview.tasks.total], ['Pending tasks', overview.tasks.todo], ['Completed tasks', overview.tasks.completed], ['In-progress tasks', overview.tasks.inProgress],
  ] : [];
  return <div className="min-h-screen bg-[#F5F3FF] dark:bg-[#0B0B14]"><DashboardNavbar activeTab="analytics"/><main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-purple-600 dark:text-purple-300">F07 · Insights</p><h1 className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-white">Analytics</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Workspace meeting and project activity from persisted records.</p></div><button type="button" onClick={exportPdf} disabled={!data || loading} className="rounded-xl bg-[#6D28D9] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Export PDF report</button></header>
    <section className="grid grid-cols-1 gap-3 rounded-2xl border border-purple-100/70 bg-white p-4 dark:border-purple-900/30 dark:bg-[#151522] sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-medium text-slate-600 dark:text-slate-300">From<input aria-label="From date" type="date" value={filters.from} onChange={(e) => changeFilter('from', e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700"/></label><label className="text-xs font-medium text-slate-600 dark:text-slate-300">To<input aria-label="To date" type="date" value={filters.to} onChange={(e) => changeFilter('to', e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700"/></label><label className="text-xs font-medium text-slate-600 dark:text-slate-300">Workspace<select aria-label="Workspace filter" value={filters.workspaceId || ''} onChange={(e) => changeFilter('workspaceId', e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-[#0B0B14]"><option value="">All accessible workspaces</option>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label><label className="text-xs font-medium text-slate-600 dark:text-slate-300">Group by<select aria-label="Group by" value={filters.groupBy} onChange={(e) => changeFilter('groupBy', e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-[#0B0B14]"><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></select></label></section>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
    {loading ? <div role="status" aria-label="Loading analytics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white dark:bg-[#151522]"/>)}</div> : data ? <>
      <section aria-label="Analytics KPIs" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{kpis.map(([label, value]) => <Kpi key={label} label={String(label)} value={value as string | number} hint={label === 'Total meeting duration' ? 'Completed meetings with valid start and end times' : undefined}/>)}</section>
      {!overview?.meetings.total && !data.tasks.total && !data.ai.transcriptSegments && <div className="rounded-2xl border border-dashed border-slate-300 py-6 text-center text-sm text-slate-500 dark:border-slate-700">No analytics records were found for this filter range.</div>}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2"><BarChart title="Meetings per period" rows={meetingTrend}/><BarChart title="Completed meeting duration (minutes)" rows={data.meetings.durations.map((row) => ({ _id: row._id, value: Math.round(row.totalMs / 60000) }))} valueKey="value"/><BarChart title="Attendance records per period" rows={data.meetings.attendance.map((row) => ({ _id: row._id, count: row.attendanceRecords }))}/><BarChart title="Meeting activity by workspace" rows={data.meetings.byWorkspace.map((row) => ({ _id: row.name, count: row.count }))}/></section>
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2"><BarChart title="Tasks by priority" rows={Object.entries(data.tasks.priorities).map(([priority, count]) => ({ _id: priority, count }))}/><BarChart title="Tasks by workspace" rows={data.tasks.byWorkspace.map((row) => ({ _id: row.name, count: row.count }))}/><BarChart title="Assigned tasks by member" rows={data.tasks.byAssignee.map((row) => ({ _id: row.name, count: row.assigned }))}/><BarChart title="Meeting status (created in selected period)" rows={Object.entries(data.meetings.status).map(([status, count]) => ({ _id: status, count }))}/></section>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"><Kpi label="Transcript meetings" value={data.ai.transcriptMeetings}/><Kpi label="Transcript segments" value={data.ai.transcriptSegments}/><Kpi label="Meetings with summaries" value={data.ai.meetingsWithSummaries}/><Kpi label="Meeting action items" value={data.ai.actionItems} hint="Separate from workspace project tasks"/><Kpi label="Completed recordings" value={data.ai.recordings}/><Kpi label="Meetings recorded" value={data.ai.meetingsWithRecordings}/></section>
      <section className="overflow-x-auto rounded-2xl border border-purple-100/70 bg-white p-5 dark:border-purple-900/30 dark:bg-[#151522]"><h2 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Workspace comparison</h2><table className="w-full min-w-[600px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Workspace</th><th>Meetings</th><th>Completed</th><th>Tasks</th><th>Tasks done</th></tr></thead><tbody>{data.workspaces.workspaces.map((row) => <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800"><td className="py-2 font-medium text-slate-900 dark:text-white">{row.name}</td><td>{row.meetings}</td><td>{row.completed}</td><td>{row.tasks}</td><td>{row.completedTasks}</td></tr>)}</tbody></table>{!data.workspaces.workspaces.length && <p className="py-6 text-center text-sm text-slate-500">No workspace data available.</p>}</section>
    </> : null}
  </main></div>;
}
