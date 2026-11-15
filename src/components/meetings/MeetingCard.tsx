import { useState } from 'react';
import type { Meeting } from '../../types/meeting';
import { meetingApi } from '../../services/meetingApi';
import MeetingStatusBadge from './MeetingStatusBadge';

interface MeetingCardProps {
  meeting: Meeting;
  onJoin: (meeting: Meeting) => void;
  currentUserId?: string;
  onEndMeeting?: (meeting: Meeting) => void;
  onEditMeeting?: (meeting: Meeting) => void;
  onCancelMeeting?: (meeting: Meeting) => void;
  timeZone?: string;
}

export default function MeetingCard({
  meeting,
  onJoin,
  currentUserId,
  onEndMeeting,
  onEditMeeting,
  onCancelMeeting,
  timeZone,
}: MeetingCardProps) {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const effectiveTimeZone = (meeting as { timeZone?: string }).timeZone || timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const formatMeetingDateTime = (dateStr?: string) => {
    if (!dateStr) return 'Flexible Schedule';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat(undefined, {
        timeZone: effectiveTimeZone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const share = async () => {
    setIsSharing(true);
    try {
      const invitation = await meetingApi.getMeetingInvitation(meeting.id);
      const link = `${window.location.origin}/join/${invitation.invitationId}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.alert('Unable to retrieve or copy this meeting invitation.');
    } finally {
      setIsSharing(false);
    }
  };

  const isLive = meeting.status === 'live';
  const isScheduled = meeting.status === 'scheduled';
  const isEnded = meeting.status === 'ended';
  const isCancelled = meeting.status === 'cancelled';

  const isCreator = Boolean(currentUserId && meeting.createdBy === currentUserId);

  const hostInitials = meeting.createdByUser
    ? `${meeting.createdByUser.firstName?.[0] || ''}${meeting.createdByUser.lastName?.[0] || ''}`.toUpperCase()
    : 'H';

  const hostFullName = meeting.createdByUser
    ? `${meeting.createdByUser.firstName} ${meeting.createdByUser.lastName}`
    : 'Workspace Host';

  // Join window check: allow Join Early within 15 minutes before scheduled start, or anytime if host
  const canJoinEarly = (() => {
    if (!meeting.scheduledAt) return true;
    if (isCreator) return true;
    const scheduledTime = new Date(meeting.scheduledAt).getTime();
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;
    return now >= scheduledTime - fifteenMinutes;
  })();

  return (
    <div className="group bg-white dark:bg-[#1C1C2E] border border-slate-200/90 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700/70 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between outline-none focus-within:ring-2 focus-within:ring-[#6D28D9]">
      {/* Top section */}
      <div>
        {/* Status badge, Date/Time & Timezone */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <MeetingStatusBadge status={meeting.status} />
          <div className="text-right">
            <span className="block text-[11px] font-semibold text-[#0F172A] dark:text-slate-200 leading-tight">
              {formatMeetingDateTime(meeting.scheduledAt || meeting.startedAt || meeting.createdAt)}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              {effectiveTimeZone}
            </span>
          </div>
        </div>

        {/* Meeting Title with full text tooltip */}
        <h3
          className="text-base font-bold text-[#0F172A] dark:text-white mb-1.5 line-clamp-1 group-hover:text-[#6D28D9] dark:group-hover:text-[#C4B5FD] transition-colors"
          title={meeting.title}
        >
          {meeting.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-[#64748B] dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
          {meeting.description || 'No description provided for this session.'}
        </p>
      </div>

      {/* Footer Info & Actions */}
      <div className="pt-3.5 mt-auto border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-3">
        {/* Host + Participant Counter */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-[#6D28D9] to-[#8B5CF6] text-white flex items-center justify-center text-[10px] font-bold shadow-sm"
              title={`Host: ${hostFullName}`}
            >
              {hostInitials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#0F172A] dark:text-white truncate leading-tight">
                {hostFullName}
                {isCreator && (
                  <span className="ml-1.5 text-[9px] px-1.5 py-0.2 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-[#C4B5FD] rounded font-semibold">
                    You
                  </span>
                )}
              </p>
              {meeting.participantCount !== undefined && (
                <p className="text-[10px] text-[#64748B] dark:text-slate-400 leading-tight">
                  {meeting.participantCount} participant{meeting.participantCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Quick Share action button */}
          {!isEnded && !isCancelled && (
            <button
              type="button"
              onClick={() => void share()}
              disabled={isSharing}
              aria-label="Share meeting invitation link"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg text-purple-700 dark:text-[#C4B5FD] hover:bg-purple-50 dark:hover:bg-purple-950/50 border border-purple-200/80 dark:border-purple-800/40 transition-colors shrink-0"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>Share</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Primary and Management Actions */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {/* Creator edit / cancel triggers */}
          <div className="flex items-center gap-1.5">
            {isCreator && isScheduled && (
              <>
                {onEditMeeting && (
                  <button
                    type="button"
                    onClick={() => onEditMeeting(meeting)}
                    className="px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-[#6D28D9] dark:hover:text-[#C4B5FD] transition-colors"
                  >
                    Edit
                  </button>
                )}
                {onCancelMeeting && (
                  <button
                    type="button"
                    onClick={() => onCancelMeeting(meeting)}
                    className="px-2 py-1 text-[11px] font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </>
            )}
          </div>

          {/* Join / Status Action Button */}
          <div className="ml-auto shrink-0">
            {isLive && (
              <div className="flex items-center gap-2">
                {isCreator && onEndMeeting && (
                  <button
                    type="button"
                    onClick={() => onEndMeeting(meeting)}
                    className="rounded-lg border border-red-200 dark:border-red-900 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    End Meeting
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onJoin(meeting)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-950/20 active:scale-[0.985] transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                disabled={!canJoinEarly}
                title={canJoinEarly ? 'Join the meeting room now' : 'Early joining opens 15 minutes before start'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                  canJoinEarly
                    ? 'text-[#6D28D9] dark:text-[#C4B5FD] bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 border-purple-200 dark:border-purple-800 shadow-sm'
                    : 'text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60'
                }`}
              >
                <svg className="w-3.5 h-3.5 text-[#6D28D9] dark:text-[#C4B5FD]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{canJoinEarly ? 'Join Early' : 'Opens Soon'}</span>
              </button>
            )}

            {isEnded && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium px-2.5 py-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
                Concluded
              </span>
            )}

            {isCancelled && (
              <span className="text-[11px] text-red-500 dark:text-red-400 font-medium px-2.5 py-1 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-lg">
                Cancelled
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
