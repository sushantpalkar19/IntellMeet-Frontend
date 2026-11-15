import { useState } from 'react';
import type { Meeting } from '../../types/meeting';
import { meetingApi } from '../../services/meetingApi';
import { useNavigate } from 'react-router-dom';

interface JoinMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableMeetings?: Meeting[];
  onSelectMeeting?: (meeting: Meeting) => void;
}

export default function JoinMeetingModal({
  isOpen,
  onClose,
  availableMeetings = [],
  onSelectMeeting,
}: JoinMeetingModalProps) {
  const navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState('');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'info' | 'error';
    text: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingCode.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid meeting code or ID.' });
      return;
    }

    const matchedMeeting = availableMeetings.find(
      (m) =>
        m.id.toLowerCase() === meetingCode.trim().toLowerCase() ||
        (m.meetingCode && m.meetingCode.toLowerCase() === meetingCode.trim().toLowerCase())
    );

    if (matchedMeeting && onSelectMeeting) {
      onSelectMeeting(matchedMeeting);
      onClose();
      return;
    }

    try {
      const result = await meetingApi.joinByCode(meetingCode);
      onClose();
      navigate(`/meeting/${result.meetingId}`);
    } catch (error) {
      const response = error as { response?: { data?: { message?: string } } };
      setStatusMessage({ type: 'error', text: response.response?.data?.message || 'Could not join that meeting.' });
    }
  };

  const liveMeetings = availableMeetings.filter((m) => m.status === 'live');

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-meeting-title"
    >
      <div className="bg-[#171525] text-white rounded-2xl shadow-2xl border border-purple-900/40 max-w-lg w-full p-6 sm:p-7 text-left relative transform transition-all animate-card-entrance">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-purple-900/30">
          <div>
            <h2 id="join-meeting-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Join a Meeting
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Enter a meeting code or invitation ID to participate.
            </p>
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

        {/* Join by Code Form */}
        <form onSubmit={handleJoinByCode} className="mt-5 space-y-4">
          <div>
            <label htmlFor="meeting-code-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Meeting Code or ID
            </label>
            <div className="relative">
              <input
                id="meeting-code-input"
                type="text"
                value={meetingCode}
                onChange={(e) => {
                  setMeetingCode(e.target.value);
                  setStatusMessage(null);
                }}
                placeholder="e.g., mtg-7b2a-4f9e or abc-defg-hij"
                className="w-full px-3.5 py-2.5 bg-[#12111E] border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/25 transition-all"
                autoFocus
              />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              You can find this code in your meeting invitation link or email.
            </p>
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                statusMessage.type === 'error'
                  ? 'bg-red-950/50 border border-red-800/60 text-red-200'
                  : 'bg-purple-950/40 border border-purple-800/40 text-purple-200'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-700/80 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 focus:outline-none transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#6D28D9] hover:bg-[#5B21B6] dark:bg-[#7C3AED] dark:hover:bg-[#6D28D9] text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-950/40 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] active:scale-[0.985] transition-all"
            >
              Join Meeting
            </button>
          </div>
        </form>

        {/* Available Live Meetings in Workspace */}
        {liveMeetings.length > 0 && (
          <div className="mt-6 pt-5 border-t border-purple-900/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Live Meetings in This Workspace
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {liveMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="p-3 bg-[#12111E] border border-slate-800 hover:border-purple-700/60 rounded-xl flex items-center justify-between transition-all"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <h4 className="text-sm font-medium text-white">{meeting.title}</h4>
                    </div>
                    {meeting.createdByUser && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Host: {meeting.createdByUser.firstName} {meeting.createdByUser.lastName}
                      </p>
                    )}
                  </div>
                  {onSelectMeeting && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectMeeting(meeting);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                    >
                      Join Now
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
