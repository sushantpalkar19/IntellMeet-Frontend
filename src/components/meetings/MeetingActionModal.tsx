import type { Meeting } from '../../types/meeting';
import MeetingStatusBadge from './MeetingStatusBadge';

interface MeetingActionModalProps {
  meeting: Meeting | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MeetingActionModal({ meeting, isOpen, onClose }: MeetingActionModalProps) {
  if (!isOpen || !meeting) return null;

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'Not scheduled';
    try {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const hostName = meeting.createdByUser
    ? `${meeting.createdByUser.firstName} ${meeting.createdByUser.lastName}`
    : 'Workspace Host';

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meeting-action-title"
    >
      <div className="bg-[#171525] text-white rounded-2xl shadow-2xl border border-purple-900/40 max-w-lg w-full p-6 sm:p-7 text-left relative transform transition-all animate-card-entrance">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-purple-900/30">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <MeetingStatusBadge status={meeting.status} />
              <span className="text-xs text-slate-400 font-mono">ID: {meeting.id}</span>
            </div>
            <h2 id="meeting-action-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {meeting.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 focus:outline-none p-1.5 rounded-xl transition-colors duration-150"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Meeting Information */}
        <div className="py-4 space-y-3.5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Description</p>
            <p className="text-sm text-slate-200 mt-1 leading-relaxed">{meeting.description || 'No description provided.'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="p-3 bg-[#12111E] rounded-xl border border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Scheduled Time</p>
              <p className="text-xs text-slate-200 mt-1 font-medium">{formatDateTime(meeting.scheduledAt || meeting.startedAt)}</p>
            </div>
            <div className="p-3 bg-[#12111E] rounded-xl border border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Host</p>
              <p className="text-xs text-slate-200 mt-1 font-medium">
                {hostName}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-purple-900/30 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-700/80 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 focus:outline-none transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
