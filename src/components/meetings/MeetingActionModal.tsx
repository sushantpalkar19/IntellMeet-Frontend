import type { Meeting } from '../../types/meeting';
import MeetingStatusBadge from './MeetingStatusBadge';

interface MeetingActionModalProps {
  meeting: Meeting | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MeetingActionModal({ meeting, isOpen, onClose }: MeetingActionModalProps) {
  if (!isOpen || !meeting) return null;

  const formatDateTime = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meeting-action-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 text-left relative transform transition-all">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <MeetingStatusBadge status={meeting.status} />
              <span className="text-xs text-gray-500 font-mono">ID: {meeting.id}</span>
            </div>
            <h2 id="meeting-action-title" className="text-xl font-bold text-gray-900">
              {meeting.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded-md"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Meeting Information */}
        <div className="py-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</p>
            <p className="text-sm text-gray-700 mt-1">{meeting.description || 'No description provided.'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scheduled For</p>
              <p className="text-xs text-gray-800 mt-1 font-medium">{formatDateTime(meeting.scheduledAt || meeting.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Organizer</p>
              <p className="text-xs text-gray-800 mt-1 font-medium">
                {meeting.createdByUser ? `${meeting.createdByUser.firstName} ${meeting.createdByUser.lastName}` : 'Team Lead'}
              </p>
            </div>
          </div>
        </div>

        {/* Informational Banner */}
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-3 mb-5">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-xs font-semibold text-blue-900">Phase 6 - Step 1 UI Scope</h4>
            <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
              Real-time video/audio calling, WebRTC peer connection, and Socket.IO signaling are not yet connected in the backend. These will be enabled in subsequent steps when backend meeting routes are deployed.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

