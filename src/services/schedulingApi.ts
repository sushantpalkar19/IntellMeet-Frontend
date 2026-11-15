import api from './authApi';
import type { Meeting, MeetingStatus } from '../types/meeting';

function notifyDashboardDataUpdated() { if (typeof window !== 'undefined') window.dispatchEvent(new Event('intellmeet:data-updated')); }

export interface ScheduledMeeting extends Meeting { endsAt?: string; timeZone: string; meetingType: 'team' | 'one_on_one' | 'other'; agenda: string; reminderMinutes: number[] }
export interface MeetingInvitee { id: string; userId: string; firstName: string; lastName: string; email: string; status: 'invited' | 'accepted' | 'declined' }
export interface CalendarNotification { id: string; type: string; title: string; message: string; meetingId: string; createdAt: string; readAt?: string }
export interface ScheduleInput { workspaceId: string; title: string; description: string; localStart: string; localEnd: string; timeZone: string; meetingType: ScheduledMeeting['meetingType']; agenda: string; inviteeIds: string[]; reminderMinutes: number[] }

export const schedulingApi = {
  schedule: async (input: ScheduleInput) => { const result = (await api.post('/v1/meetings/scheduled', input)).data as { meeting: ScheduledMeeting }; notifyDashboardDataUpdated(); return result; },
  calendar: async (range: { from: string; to: string; workspaceId?: string; status?: MeetingStatus }) => (await api.get('/v1/meetings/calendar', { params: range })).data as { meetings: ScheduledMeeting[] },
  upcoming: async () => (await api.get('/v1/meetings/upcoming')).data as { meetings: ScheduledMeeting[] },
  details: async (meetingId: string) => (await api.get(`/v1/meetings/${meetingId}/schedule-details`)).data as { meeting: ScheduledMeeting; invitees: MeetingInvitee[] },
  update: async (meetingId: string, input: Partial<ScheduleInput>) => { const result = (await api.put(`/v1/meetings/${meetingId}/schedule`, input)).data as { meeting: ScheduledMeeting }; notifyDashboardDataUpdated(); return result; },
  cancel: async (meetingId: string) => { const result = (await api.post(`/v1/meetings/${meetingId}/cancel`)).data as { meeting: ScheduledMeeting }; notifyDashboardDataUpdated(); return result; },
  addInvitees: async (meetingId: string, inviteeIds: string[]) => (await api.post(`/v1/meetings/${meetingId}/invitees`, { inviteeIds })).data as { invitees: MeetingInvitee[] },
  removeInvitee: async (meetingId: string, userId: string) => api.delete(`/v1/meetings/${meetingId}/invitees/${userId}`),
  notifications: async (page = 1) => (await api.get('/v1/notifications', { params: { page, limit: 30 } })).data as { notifications: CalendarNotification[]; unread: number },
  markRead: async (notificationId: string) => (await api.patch(`/v1/notifications/${notificationId}/read`)).data,
  getReminderPreference: async () => (await api.get('/v1/notifications/preferences/reminders')).data as { preference: { enabled: boolean; reminderMinutes: number[] } },
  setReminderPreference: async (enabled: boolean, reminderMinutes: number[]) => (await api.put('/v1/notifications/preferences/reminders', { enabled, reminderMinutes })).data as { preference: { enabled: boolean; reminderMinutes: number[] } },
};

export function zonedDateTimeToUtc(local: string, timeZone: string): Date {
  const [date, time] = local.split('T'); const [year, month, day] = date.split('-').map(Number); const [hour, minute] = time.split(':').map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute); const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const matchesLocal = (candidate: number) => { const parts = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map((p) => [p.type, p.value])); return Number(parts.year) === year && Number(parts.month) === month && Number(parts.day) === day && Number(parts.hour) === hour && Number(parts.minute) === minute; };
  let timestamp = target;
  for (let i = 0; i < 4; i += 1) { const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map((p) => [p.type, p.value])); timestamp += target - Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute)); }
  if (!matchesLocal(timestamp)) throw new Error('This local time does not exist in that time zone because of a daylight-saving change.');
  for (let offsetMinutes = -180; offsetMinutes <= 180; offsetMinutes += 15) if (offsetMinutes !== 0 && matchesLocal(timestamp + offsetMinutes * 60_000)) throw new Error('This local time occurs twice in that time zone because of a daylight-saving change. Choose another time.');
  return new Date(timestamp);
}

export function formatInTimeZone(date: string | Date, timeZone: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(undefined, { timeZone, ...options }).format(new Date(date));
}
