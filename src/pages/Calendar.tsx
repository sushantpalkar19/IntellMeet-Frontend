import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardNavbar from '../components/layout/DashboardNavbar';
import CustomDateTimePicker from '../components/ui/CustomDateTimePicker';
import { schedulingApi, formatInTimeZone, zonedDateTimeToUtc, type ScheduledMeeting, type MeetingInvitee, type ScheduleInput } from '../services/schedulingApi';
import { workspaceApi, type Workspace, type WorkspaceMember } from '../services/workspaceApi';
import { meetingApi } from '../services/meetingApi';
import { useAuthStore } from '../stores/authStore';
import { getApiErrorMessage } from '../utils/apiError';

type View = 'month' | 'week' | 'day';
const pad = (n: number) => String(n).padStart(2, '0');
const keyFor = (date: Date, zone: string) => { const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map((p) => [p.type, p.value])); return `${parts.year}-${parts.month}-${parts.day}`; };
const addKeyDays = (key: string, count: number) => { const [y, m, d] = key.split('-').map(Number); const date = new Date(Date.UTC(y, m - 1, d + count)); return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`; };
const localInput = (date?: string, zone = 'UTC') => { if (!date) return ''; const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(date)).map((p) => [p.type, p.value])); return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`; };
const zones = (() => { try { return (Intl as unknown as { supportedValuesOf: (key: 'timeZone') => string[] }).supportedValuesOf('timeZone'); } catch { return ['UTC', 'Asia/Kolkata', 'America/New_York', 'Europe/London']; } })();
const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const availableZones = [...new Set([localZone, 'UTC', ...zones])];
const emptyForm = (workspaceId: string, timeZone: string): ScheduleInput => { const start = new Date(Date.now() + 60 * 60_000); start.setMinutes(0, 0, 0); const end = new Date(start.getTime() + 60 * 60_000); return { workspaceId, title: '', description: '', localStart: localInput(start.toISOString(), timeZone), localEnd: localInput(end.toISOString(), timeZone), timeZone, meetingType: 'team', agenda: '', inviteeIds: [], reminderMinutes: [15, 5] }; };

export default function Calendar() {
  const navigate = useNavigate(); const [searchParams, setSearchParams] = useSearchParams(); const { user } = useAuthStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]); const [workspaceId, setWorkspaceId] = useState(() => searchParams.get('workspaceId') || ''); const [view, setView] = useState<View>('month'); const [anchor, setAnchor] = useState(() => new Date()); const [timeZone, setTimeZone] = useState(localZone);
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]); const [upcoming, setUpcoming] = useState<ScheduledMeeting[]>([]); const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [selected, setSelected] = useState<ScheduledMeeting | null>(null); const [invitees, setInvitees] = useState<MeetingInvitee[]>([]); const [form, setForm] = useState<ScheduleInput | null>(null); const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');

  useEffect(() => { void workspaceApi.getWorkspaces().then(({ workspaces: values }) => { setWorkspaces(values); const requestedWorkspace = searchParams.get('workspaceId'); if (requestedWorkspace && values.some((value) => value.id === requestedWorkspace)) setWorkspaceId(requestedWorkspace); }).catch(() => setError('Workspaces could not be loaded.')); }, [searchParams]);
  useEffect(() => { if (!workspaceId) { setMembers([]); return; } void workspaceApi.getWorkspaceMembers(workspaceId).then(({ members: values }) => setMembers(values)).catch(() => setMembers([])); }, [workspaceId]);

  const dateKeys = useMemo(() => { const todayKey = keyFor(anchor, timeZone); if (view === 'day') return [todayKey]; if (view === 'week') { const utc = new Date(`${todayKey}T00:00:00Z`); const mondayOffset = (utc.getUTCDay() + 6) % 7; const first = addKeyDays(todayKey, -mondayOffset); return Array.from({ length: 7 }, (_, i) => addKeyDays(first, i)); } const firstDate = new Date(Date.UTC(anchor.getFullYear(), anchor.getMonth(), 1)); const mondayOffset = (firstDate.getUTCDay() + 6) % 7; const first = `${firstDate.getUTCFullYear()}-${pad(firstDate.getUTCMonth() + 1)}-${pad(firstDate.getUTCDate() - mondayOffset)}`; return Array.from({ length: 42 }, (_, i) => addKeyDays(first, i)); }, [anchor, timeZone, view]);
  const range = useMemo(() => { try { const start = zonedDateTimeToUtc(`${dateKeys[0]}T00:00`, timeZone); const end = zonedDateTimeToUtc(`${addKeyDays(dateKeys[dateKeys.length - 1], 1)}T00:00`, timeZone); return { from: start.toISOString(), to: end.toISOString() }; } catch { return null; } }, [dateKeys, timeZone]);
  const loadMeetings = useCallback(async () => { if (!range) return; setLoading(true); setError(''); try { const [calendar, next] = await Promise.all([schedulingApi.calendar({ ...range, workspaceId: workspaceId || undefined }), schedulingApi.upcoming()]); setMeetings(calendar.meetings); setUpcoming(next.meetings); } catch { setError('Calendar events could not be loaded.'); } finally { setLoading(false); } }, [range, workspaceId]);
  useEffect(() => { void loadMeetings(); }, [loadMeetings]);
  useEffect(() => { const meetingId = searchParams.get('meeting'); const create = searchParams.get('create') === '1'; if (meetingId) void schedulingApi.details(meetingId).then((result) => { setSelected(result.meeting); setInvitees(result.invitees); }).catch(() => setError('You do not have access to this meeting.')); if (create) setForm(emptyForm(searchParams.get('workspaceId') || workspaceId, timeZone)); if (meetingId || create) setSearchParams({}, { replace: true }); }, [searchParams, setSearchParams, timeZone, workspaceId]);

  const meetingsByDay = useMemo(() => { const map = new Map<string, ScheduledMeeting[]>(); meetings.forEach((meeting) => { if (!meeting.scheduledAt) return; const key = keyFor(new Date(meeting.scheduledAt), timeZone); map.set(key, [...(map.get(key) || []), meeting]); }); return map; }, [meetings, timeZone]);
  const title = view === 'day' ? formatInTimeZone(anchor, timeZone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : view === 'week' ? `${formatInTimeZone(`${dateKeys[0]}T12:00:00Z`, timeZone, { month: 'short', day: 'numeric' })} - ${formatInTimeZone(`${dateKeys[6]}T12:00:00Z`, timeZone, { month: 'short', day: 'numeric', year: 'numeric' })}` : formatInTimeZone(new Date(Date.UTC(anchor.getFullYear(), anchor.getMonth(), 15)), timeZone, { month: 'long', year: 'numeric' });
  const shift = (amount: number) => setAnchor((current) => { const next = new Date(current); if (view === 'month') next.setMonth(next.getMonth() + amount); else next.setDate(next.getDate() + amount * (view === 'week' ? 7 : 1)); return next; });
  const openCreate = () => { setSelected(null); setEditing(false); setForm(emptyForm(workspaceId, timeZone)); setError(''); setNotice(''); };
  const openDetails = async (meeting: ScheduledMeeting) => { setError(''); setNotice(''); try { const data = await schedulingApi.details(meeting.id); setSelected(data.meeting); setInvitees(data.invitees); } catch { setError('Meeting details could not be loaded.'); } };
  const openEdit = () => { if (!selected) return; setWorkspaceId(selected.workspaceId); setForm({ workspaceId: selected.workspaceId, title: selected.title, description: selected.description || '', localStart: localInput(selected.scheduledAt, selected.timeZone), localEnd: localInput(selected.endsAt, selected.timeZone), timeZone: selected.timeZone, meetingType: selected.meetingType, agenda: selected.agenda, inviteeIds: invitees.map((item) => item.userId), reminderMinutes: selected.reminderMinutes }); setTimeZone(selected.timeZone); setEditing(true); };
  const save = async (event: React.FormEvent) => { event.preventDefault(); if (!form) return; setError(''); setNotice(''); if (!form.title.trim()) { setError('Meeting title is required.'); return; } try { const start = zonedDateTimeToUtc(form.localStart, form.timeZone); const end = zonedDateTimeToUtc(form.localEnd, form.timeZone); if (start <= new Date()) throw new Error('Meeting start must be in the future.'); if (end <= start) throw new Error('End time must be after start time.'); setBusy(true); if (editing && selected) { const { inviteeIds, ...update } = form; await schedulingApi.update(selected.id, update); const currentIds = invitees.map((item) => item.userId); const toAdd = inviteeIds.filter((value) => !currentIds.includes(value)); const toRemove = currentIds.filter((value) => !inviteeIds.includes(value)); if (toAdd.length) await schedulingApi.addInvitees(selected.id, toAdd); for (const removeId of toRemove) await schedulingApi.removeInvitee(selected.id, removeId); const fresh = await schedulingApi.details(selected.id); setSelected(fresh.meeting); setInvitees(fresh.invitees); setForm(null); setEditing(false); setNotice('Meeting updated.'); } else { await schedulingApi.schedule(form); setForm(null); setNotice('Meeting scheduled. Invitees will see an in-app notification.'); } await loadMeetings(); } catch (failure) { setError(getApiErrorMessage(failure, (failure as Error).message || 'The meeting could not be saved.')); } finally { setBusy(false); } };
  const cancelMeeting = async () => { if (!selected || !window.confirm(`Cancel ${selected.title}? Invited participants will be notified.`)) return; setBusy(true); setError(''); try { const { meeting } = await schedulingApi.cancel(selected.id); setSelected(meeting); setNotice('Meeting cancelled.'); await loadMeetings(); } catch { setError('This meeting could not be cancelled.'); } finally { setBusy(false); } };
  const join = async () => { if (!selected) return; setBusy(true); try { await meetingApi.joinMeeting(selected.id); navigate(`/meeting/${selected.id}`); } catch { setError('You cannot join this meeting right now.'); } finally { setBusy(false); } };
  const share = async (value: 'link' | 'meetingId' | 'joinCode') => { if (!selected) return; try { const invitation = await meetingApi.getMeetingInvitation(selected.id); const link = `${window.location.origin}/join/${invitation.invitationId}`; const text = value === 'link' ? link : value === 'meetingId' ? invitation.meetingId : invitation.joinCode; await navigator.clipboard.writeText(text); setNotice(`${value === 'link' ? 'Meeting link' : value === 'meetingId' ? 'Meeting ID' : 'Join code'} copied.`); } catch { setError('Only the host can access invitation details.'); } };
  const selectMember = (memberId: string) => setForm((current) => current ? { ...current, inviteeIds: current.inviteeIds.includes(memberId) ? current.inviteeIds.filter((id) => id !== memberId) : [...current.inviteeIds, memberId] } : current);
  const canManage = selected && (selected.createdBy === user?.id || ['owner', 'admin'].includes(workspaces.find((item) => item.id === selected.workspaceId)?.role || ''));

  const activeUpcoming = useMemo(() => {
    return upcoming.filter((meeting) => meeting.status !== 'cancelled' && meeting.status !== 'ended');
  }, [upcoming]);

  const pastMeetings = useMemo(() => {
    return meetings.filter((meeting) => meeting.scheduledAt && new Date(meeting.scheduledAt) < new Date());
  }, [meetings]);

  return <div className="min-h-screen bg-[#F5F3FF] dark:bg-[#0B0B14]"><DashboardNavbar activeTab="calendar" /><main className="mx-auto max-w-7xl space-y-5 px-4 py-7 sm:px-6 lg:px-8"><header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-600 dark:text-violet-300">Plan together</p><h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">Calendar</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Schedule and manage workspace meetings.</p></div><button onClick={openCreate} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">Schedule meeting</button></header>
    {error && !form && <p role="alert" className="rounded-xl border border-red-300/30 bg-red-950/20 p-3 text-sm text-red-700 dark:text-red-200">{error}</p>}{notice && <p role="status" className="rounded-xl border border-emerald-300/30 bg-emerald-950/10 p-3 text-sm text-emerald-700 dark:text-emerald-200">{notice}</p>}
    <section className="rounded-2xl border border-purple-100/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#151522] sm:p-5"><div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap items-center gap-2"><button aria-label="Previous" onClick={() => shift(-1)} className="rounded-lg border px-3 py-2 text-sm dark:border-white/15">Prev</button><button onClick={() => setAnchor(new Date())} className="rounded-lg border px-3 py-2 text-xs font-semibold dark:border-white/15">Today</button><button aria-label="Next" onClick={() => shift(1)} className="rounded-lg border px-3 py-2 text-sm dark:border-white/15">Next</button><h2 className="ml-2 min-w-48 text-lg font-bold text-slate-900 dark:text-white">{title}</h2></div><div className="flex flex-wrap gap-2"><select aria-label="Workspace filter" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} className="rounded-lg border bg-transparent px-3 py-2 text-xs dark:border-white/15"><option value="">All workspaces</option>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select><select aria-label="Calendar time zone" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className="max-w-56 rounded-lg border bg-transparent px-3 py-2 text-xs dark:border-white/15">{availableZones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}</select><div className="flex rounded-lg border p-1 dark:border-white/15">{(['month', 'week', 'day'] as View[]).map((option) => <button key={option} onClick={() => setView(option)} className={`rounded px-2.5 py-1 text-xs capitalize ${view === option ? 'bg-violet-600 text-white' : 'text-slate-500'}`}>{option}</button>)}</div></div></div>
      <div className={`grid ${view === 'day' ? 'grid-cols-1' : 'grid-cols-7'} border-b border-slate-200 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10`}>{(view === 'day' ? [formatInTimeZone(zonedDateTimeToUtc(`${dateKeys[0]}T12:00`, timeZone), timeZone, { weekday: 'short' })] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((day) => <div key={day} className="py-2">{day}</div>)}</div>
      {loading ? <div className="py-20 text-center text-sm text-slate-500">Loading calendar...</div> : <div className={`grid ${view === 'day' ? 'grid-cols-1' : 'grid-cols-7'} ${view === 'month' ? 'grid-rows-6' : ''}`}>{dateKeys.map((key) => { const dayMeetings = meetingsByDay.get(key) || []; const currentMonth = Number(key.slice(5, 7)) === anchor.getMonth() + 1; return <div key={key} className={`min-h-24 border-b border-r border-slate-100 p-1.5 dark:border-white/5 sm:min-h-32 sm:p-2 ${view === 'month' && !currentMonth ? 'bg-slate-50/70 text-slate-300 dark:bg-black/10 dark:text-slate-600' : ''}`}><div className={`mb-1 text-xs font-semibold ${key === keyFor(new Date(), timeZone) ? 'flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}>{Number(key.slice(8))}</div><div className="space-y-1">{dayMeetings.map((meeting) => <button key={meeting.id} onClick={() => void openDetails(meeting)} className={`block w-full truncate rounded-md border-l-2 px-1.5 py-1 text-left text-[10px] sm:text-xs ${meeting.status === 'cancelled' ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-200' : meeting.status === 'live' ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-950/30 dark:text-violet-200'}`}><span className="font-semibold">{meeting.scheduledAt ? formatInTimeZone(meeting.scheduledAt, timeZone, { hour: 'numeric', minute: '2-digit' }) : ''}</span> {meeting.title}</button>)}</div></div>; })}</div>}
    </section>
    <section className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border border-purple-100/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#151522]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Upcoming meetings</h2>
          <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">{activeUpcoming.length} active</span>
        </div>
        <div className="space-y-2.5">
          {activeUpcoming.length ? (
            activeUpcoming.slice(0, 6).map((meeting) => (
              <button
                key={meeting.id}
                onClick={() => void openDetails(meeting)}
                className="flex w-full items-center justify-between rounded-xl bg-slate-50 dark:bg-[#12111E] p-3 text-left border border-slate-200/60 dark:border-slate-800 hover:border-purple-500/50 transition-colors group"
              >
                <span className="min-w-0 pr-3">
                  <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {meeting.title}
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{meeting.scheduledAt && formatInTimeZone(meeting.scheduledAt, timeZone, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      meeting.status === 'live'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                    }`}>
                      {meeting.status}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-violet-600 dark:text-violet-400 group-hover:translate-x-0.5 transition-transform">
                  View &rarr;
                </span>
              </button>
            ))
          ) : (
            <p className="py-6 text-center text-xs text-slate-500">No upcoming meetings.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-purple-100/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#151522]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Past meetings</h2>
          <span className="text-xs text-slate-400 font-medium">{pastMeetings.length} total</span>
        </div>
        <div className="space-y-2.5">
          {pastMeetings.length ? (
            pastMeetings.slice(-5).reverse().map((meeting) => (
              <button
                key={meeting.id}
                onClick={() => void openDetails(meeting)}
                className="flex w-full items-center justify-between rounded-xl bg-slate-50 dark:bg-[#12111E] p-3 text-left border border-slate-200/60 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition-colors"
              >
                <span className="min-w-0 pr-3">
                  <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200 block">
                    {meeting.title}
                  </span>
                  <span className="text-xs text-slate-500">
                    {meeting.scheduledAt && formatInTimeZone(meeting.scheduledAt, timeZone, { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-300/50 dark:border-slate-700/50">
                  {meeting.status}
                </span>
              </button>
            ))
          ) : (
            <p className="py-6 text-center text-xs text-slate-500">No past meetings in this view.</p>
          )}
        </div>
      </div>
    </section>
    </main>

    {(form || selected) && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setForm(null);
            setSelected(null);
            setEditing(false);
          }
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-label={form ? (editing ? 'Edit meeting' : 'Schedule a meeting') : 'Meeting details'}
          className="relative flex flex-col w-full max-w-2xl max-h-[calc(100vh-32px)] rounded-2xl border border-purple-900/40 bg-[#171525] text-white shadow-2xl transition-all animate-card-entrance overflow-hidden"
        >
          {form ? (
            <>
              {/* Header */}
              <header className="flex shrink-0 items-start justify-between border-b border-purple-900/30 p-5 sm:px-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    {editing ? 'Edit Meeting' : 'Schedule a Meeting'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Times are saved in UTC and retain your selected workspace time zone.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setForm(null);
                    setEditing(false);
                  }}
                  aria-label="Close"
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </header>

              {/* Form Body - Scrollable */}
              <form onSubmit={save} id="schedule-meeting-form" className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Title */}
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 sm:col-span-2">
                    Title <span className="text-red-400">*</span>
                    <input
                      required
                      maxLength={200}
                      value={form.title}
                      placeholder="e.g., Weekly Sprint Planning"
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="mt-1.5 block w-full rounded-xl border border-slate-800 bg-[#12111E] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/25 transition-all"
                    />
                  </label>

                  {/* Description */}
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 sm:col-span-2">
                    Description <span className="text-slate-500 font-normal normal-case">(optional)</span>
                    <textarea
                      maxLength={1000}
                      value={form.description}
                      placeholder="Brief summary or context..."
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="mt-1.5 block w-full resize-none rounded-xl border border-slate-800 bg-[#12111E] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/25 transition-all"
                      rows={2}
                    />
                  </label>

                  {/* Start time */}
                  <div className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    <span className="block mb-1.5">
                      Start Time <span className="text-red-400">*</span>
                    </span>
                    <CustomDateTimePicker
                      required
                      value={form.localStart}
                      onChange={(newStart) => {
                        // If end time is before or equal to new start time, advance end time automatically
                        if (newStart && form.localEnd && form.localEnd <= newStart) {
                          try {
                            const [d, t] = newStart.split('T');
                            const [hh, mm] = t.split(':').map(Number);
                            const nextHour = (hh + 1) % 24;
                            const nextHourStr = String(nextHour).padStart(2, '0');
                            const mmStr = String(mm).padStart(2, '0');
                            setForm({
                              ...form,
                              localStart: newStart,
                              localEnd: `${d}T${nextHourStr}:${mmStr}`,
                            });
                            return;
                          } catch {
                            // fallback
                          }
                        }
                        setForm({ ...form, localStart: newStart });
                      }}
                      placeholder="Select start date & time"
                    />
                  </div>

                  {/* End time */}
                  <div className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    <span className="block mb-1.5">
                      End Time <span className="text-red-400">*</span>
                    </span>
                    <CustomDateTimePicker
                      required
                      value={form.localEnd}
                      minDate={form.localStart ? form.localStart.split('T')[0] : undefined}
                      onChange={(newEnd) => setForm({ ...form, localEnd: newEnd })}
                      placeholder="Select end date & time"
                    />
                  </div>

                  {/* Time Zone */}
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 sm:col-span-2">
                    Time Zone
                    <select
                      value={form.timeZone}
                      onChange={(e) => setForm({ ...form, timeZone: e.target.value })}
                      className="mt-1.5 block w-full rounded-xl border border-slate-800 bg-[#12111E] px-3.5 py-2.5 text-sm text-white focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/25 transition-all"
                    >
                      {availableZones.map((zone) => (
                        <option key={zone} value={zone} className="bg-[#171525] text-white">
                          {zone}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Meeting Type */}
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Meeting Type
                    <select
                      value={form.meetingType}
                      onChange={(e) => setForm({ ...form, meetingType: e.target.value as ScheduleInput['meetingType'] })}
                      className="mt-1.5 block w-full rounded-xl border border-slate-800 bg-[#12111E] px-3.5 py-2.5 text-sm text-white focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/25 transition-all"
                    >
                      <option value="team" className="bg-[#171525] text-white">Team Sync</option>
                      <option value="one_on_one" className="bg-[#171525] text-white">One-on-one</option>
                      <option value="other" className="bg-[#171525] text-white">Other</option>
                    </select>
                  </label>

                  {/* Workspace */}
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Workspace <span className="text-red-400">*</span>
                    <select
                      value={form.workspaceId}
                      onChange={(e) => {
                        setWorkspaceId(e.target.value);
                        setForm({ ...form, workspaceId: e.target.value, inviteeIds: [] });
                      }}
                      required
                      className="mt-1.5 block w-full rounded-xl border border-slate-800 bg-[#12111E] px-3.5 py-2.5 text-sm text-white focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/25 transition-all"
                    >
                      <option value="" className="bg-[#171525] text-slate-400">Choose workspace</option>
                      {workspaces.filter((item) => item.role !== 'viewer').map((item) => (
                        <option key={item.id} value={item.id} className="bg-[#171525] text-white">
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Agenda */}
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 sm:col-span-2">
                    Meeting Agenda <span className="text-slate-500 font-normal normal-case">(optional)</span>
                    <textarea
                      maxLength={10000}
                      value={form.agenda}
                      placeholder="Outline topics, goals, and key questions to discuss..."
                      onChange={(e) => setForm({ ...form, agenda: e.target.value })}
                      rows={3}
                      className="mt-1.5 block w-full resize-none rounded-xl border border-slate-800 bg-[#12111E] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/25 transition-all"
                    />
                  </label>
                </div>

                {/* Invite members */}
                <fieldset className="pt-2">
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Invite Workspace Members
                  </legend>
                  <div className="grid max-h-36 grid-cols-1 gap-1.5 overflow-y-auto rounded-xl border border-slate-800 bg-[#12111E] p-3 sm:grid-cols-2">
                    {members.filter((member) => member.userId !== user?.id).map((member) => (
                      <label
                        key={member.userId}
                        className="flex items-center gap-2.5 rounded-lg p-2 text-xs text-slate-300 hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={form.inviteeIds.includes(member.userId)}
                          onChange={() => selectMember(member.userId)}
                          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-[#7C3AED] focus:ring-[#7C3AED]"
                        />
                        <span className="truncate">
                          <span className="font-medium text-white">{member.firstName} {member.lastName}</span>{' '}
                          <span className="text-slate-500">({member.email})</span>
                        </span>
                      </label>
                    ))}
                    {!members.length && (
                      <span className="col-span-2 p-2 text-xs text-slate-500">
                        Choose a workspace above to view and invite teammates.
                      </span>
                    )}
                  </div>
                </fieldset>

                {/* Reminders */}
                <fieldset className="pt-1">
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Reminders
                  </legend>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-300">
                    {[15, 5].map((minutes) => (
                      <label key={minutes} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.reminderMinutes.includes(minutes)}
                          onChange={() =>
                            setForm({
                              ...form,
                              reminderMinutes: form.reminderMinutes.includes(minutes)
                                ? form.reminderMinutes.filter((n) => n !== minutes)
                                : [...form.reminderMinutes, minutes].sort((a, b) => b - a),
                            })
                          }
                          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-[#7C3AED] focus:ring-[#7C3AED]"
                        />
                        <span>{minutes} minutes before</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {error && (
                  <p role="alert" className="rounded-xl border border-red-800/60 bg-red-950/40 p-3 text-xs text-red-200">
                    {error}
                  </p>
                )}
              </form>

              {/* Footer - Fixed */}
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-purple-900/30 bg-[#171525] p-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => {
                    setForm(null);
                    setEditing(false);
                  }}
                  className="rounded-xl border border-slate-700/80 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="schedule-meeting-form"
                  disabled={busy}
                  className="rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] dark:bg-[#7C3AED] dark:hover:bg-[#6D28D9] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-950/40 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] active:scale-[0.985] disabled:opacity-50 transition-all"
                >
                  {busy ? 'Saving...' : editing ? 'Save Changes' : 'Schedule Meeting'}
                </button>
              </div>
            </>
          ) : (
            selected && (
              <div className="flex flex-col max-h-[calc(100vh-32px)]">
                {/* Header */}
                <header className="flex shrink-0 items-start justify-between border-b border-purple-900/30 p-5 sm:px-6">
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase ${
                      selected.status === 'live'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : selected.status === 'cancelled'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : selected.status === 'ended'
                        ? 'bg-slate-700/50 text-slate-400 border border-slate-700'
                        : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    }`}>
                      {selected.status}
                    </span>
                    <h2 className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-white">
                      {selected.title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      {selected.scheduledAt &&
                        formatInTimeZone(selected.scheduledAt, selected.timeZone, {
                          dateStyle: 'full',
                          timeStyle: 'short',
                        })}{' '}
                      ({selected.timeZone})
                    </p>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    aria-label="Close"
                    className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </header>

                {/* Details Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-sm text-slate-300">
                  <p className="leading-relaxed">{selected.description || 'No description provided.'}</p>
                  {selected.agenda && (
                    <div className="rounded-xl bg-[#12111E] border border-slate-800 p-3.5">
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Agenda</h3>
                      <p className="whitespace-pre-wrap text-sm text-slate-200">{selected.agenda}</p>
                    </div>
                  )}
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Invitees</h3>
                    {invitees.length ? (
                      <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                        {invitees.map((item) => (
                          <li
                            key={item.userId}
                            className="flex items-center justify-between rounded-xl bg-[#12111E] border border-slate-800 px-3.5 py-2 text-xs"
                          >
                            <span className="font-medium text-white">
                              {item.firstName} {item.lastName}{' '}
                              <span className="text-slate-400">({item.email})</span>
                            </span>
                            <span className="text-purple-300 uppercase font-semibold text-[10px] bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-800/40">
                              {item.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500">No invitees yet.</p>
                    )}
                  </div>

                  {error && (
                    <p role="alert" className="rounded-xl border border-red-800/60 bg-red-950/40 p-3 text-xs text-red-200">
                      {error}
                    </p>
                  )}
                  {notice && (
                    <p role="status" className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3 text-xs text-emerald-200">
                      {notice}
                    </p>
                  )}
                </div>

                {/* Actions Footer - Fixed */}
                <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-purple-900/30 bg-[#171525] p-4 sm:px-6">
                  {selected.createdBy === user?.id && (
                    <>
                      <button
                        onClick={() => void share('link')}
                        className="rounded-xl border border-slate-700/80 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        Copy meeting link
                      </button>
                      <button
                        onClick={() => void share('meetingId')}
                        className="rounded-xl border border-slate-700/80 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        Copy Meeting ID
                      </button>
                      <button
                        onClick={() => void share('joinCode')}
                        className="rounded-xl border border-slate-700/80 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        Copy join code
                      </button>
                    </>
                  )}
                  {selected.status !== 'cancelled' && selected.status !== 'ended' && (
                    <button
                      onClick={() => void join()}
                      disabled={busy}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition-colors"
                    >
                      Join meeting
                    </button>
                  )}
                  {canManage && selected.status === 'scheduled' && (
                    <>
                      <button
                        onClick={openEdit}
                        className="rounded-xl border border-purple-700/60 px-3 py-2 text-xs font-medium text-purple-300 hover:bg-purple-950/40 transition-colors"
                      >
                        Edit / reschedule
                      </button>
                      <button
                        onClick={() => void cancelMeeting()}
                        disabled={busy}
                        className="rounded-xl border border-red-800/60 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-950/30 transition-colors"
                      >
                        Cancel meeting
                      </button>
                    </>
                  )}
                </footer>
              </div>
            )
          )}
        </section>
      </div>
    )}
  </div>;
}
