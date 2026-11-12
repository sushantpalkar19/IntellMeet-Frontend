import type { Meeting } from '../../types/meeting';
import { meetingApi } from '../../services/meetingApi';
import MeetingStatusBadge from './MeetingStatusBadge';

interface MeetingCardProps {
  meeting: Meeting;
  onJoin: (meeting: Meeting) => void;
  currentUserId?: string;
  onEndMeeting?: (meeting: Meeting) => void;
}

export default function MeetingCard({ meeting, onJoin, currentUserId, onEndMeeting }: MeetingCardProps) {
  const share = async () => {
    try {
      const invitation = await meetingApi.getMeetingInvitation(meeting.id);
      const link = `${window.location.origin}/join/${invitation.invitationId}`;
      await navigator.clipboard.writeText(link);
    } catch {
      window.alert('Unable to retrieve or copy this meeting invitation.');
    }
  };
  const formatMeetingTime = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const isLive = meeting.status === 'live';
  const isScheduled = meeting.status === 'scheduled';
  const isEnded = meeting.status === 'ended';

  const hostInitials = meeting.createdByUser
    ? `${meeting.createdByUser.firstName?.[0] || ''}${meeting.createdByUser.lastName?.[0] || ''}`.toUpperCase()
    : 'H';

  return (
    <div className="group bg-white dark:bg-[#1C1C2E] border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between outline-none focus-within:ring-2 focus-within:ring-[#6D28D9]">

      {/* Top section */}
      <div>
        {/* Status badge + time */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <MeetingStatusBadge status={meeting.status} />
          <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium shrink-0 text-right leading-tight">
            {formatMeetingTime(meeting.scheduledAt || meeting.createdAt)}
          </span>
        </div>

        {/* Title — single line with tooltip for overflow */}
        <h3
          className="text-sm font-bold text-[#0F172A] dark:text-white mb-1.5 line-clamp-1 group-hover:text-[#6D28D9] dark:group-hover:text-[#C4B5FD] transition-colors"
          title={meeting.title}
        >
          {meeting.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-[#64748B] dark:text-slate-400 line-clamp-2 leading-relaxed">
          {meeting.description || 'No description provided.'}
        </p>
      </div>

      {/* Footer */}
      <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        {/* Host + participants */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-[#6D28D9] to-[#8B5CF6] text-white flex items-center justify-center text-[10px] font-bold shadow-sm"
            title={`Host: ${meeting.createdByUser?.firstName || ''} ${meeting.createdByUser?.lastName || ''}`}
          >
            {hostInitials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#0F172A] dark:text-white truncate leading-tight">
              {meeting.createdByUser ? `${meeting.createdByUser.firstName} ${meeting.createdByUser.lastName?.[0]}.` : 'Team Host'}
            </p>
            {meeting.participantCount !== undefined && (
              <p className="text-[10px] text-[#64748B] dark:text-slate-500 leading-tight">
                {meeting.participantCount} participant{meeting.participantCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Action button */}
        <div className="shrink-0">
          {meeting.createdBy === currentUserId && <button type="button" onClick={() => void share()} className="mr-2 rounded-lg border px-3 py-1.5 text-[11px] font-semibold text-purple-700">Share</button>}
          {isLive && (
            <div className="flex items-center gap-2">
            {meeting.createdBy === currentUserId && onEndMeeting && <button type="button" onClick={() => onEndMeeting(meeting)} className="rounded-lg border border-red-300 px-3 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40">End Meeting</button>}
            <button
              type="button"
              onClick={() => onJoin(meeting)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500 shadow-sm transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Join Now
            </button>
            </div>
          )}
          {isScheduled && (
            <button
              type="button"
              onClick={() => onJoin(meeting)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg text-[#6D28D9] dark:text-[#C4B5FD] bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-950 border border-purple-200 dark:border-purple-800/50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#6D28D9] transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Join Early
            </button>
          )}
          {isEnded && (
            <span className="text-[11px] text-[#64748B] dark:text-slate-500 font-medium px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
              Concluded
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
