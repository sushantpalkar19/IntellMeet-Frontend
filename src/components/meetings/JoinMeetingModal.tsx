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
      (m) => m.id.toLowerCase() === meetingCode.trim().toLowerCase()
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

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-meeting-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-left relative transform transition-all">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-gray-100">
          <div>
            <h2 id="join-meeting-title" className="text-xl font-bold text-gray-900">
              Join a Meeting
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Enter a meeting ID or select an active session below.
            </p>
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

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`mt-4 p-3 rounded-md text-xs leading-relaxed ${
              statusMessage.type === 'info'
                ? 'bg-blue-50 border border-blue-200 text-blue-800'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            <p className="font-medium">{statusMessage.text}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleJoinByCode} className="mt-4 space-y-4">
          <div>
            <label htmlFor="meeting-code-input" className="block text-sm font-medium text-gray-700 mb-1">
              Meeting ID or Code
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
                placeholder="e.g., meet-mock-001"
                className="w-full px-3 py-2 pl-9 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
              />
              <svg
                className="w-4 h-4 text-gray-400 absolute left-3 top-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            Join with Code
          </button>
        </form>

        {/* Quick Join Active Sessions */}
        {availableMeetings.filter((m) => m.status === 'live').length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Ongoing Sessions in this Workspace
            </h3>
            <div className="space-y-2">
              {availableMeetings
                .filter((m) => m.status === 'live')
                .map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      if (onSelectMeeting) onSelectMeeting(m);
                      onClose();
                    }}
                    className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-emerald-900">{m.title}</p>
                      <p className="text-[11px] text-emerald-700 font-mono mt-0.5">ID: {m.id}</p>
                    </div>
                    <span className="text-xs font-medium text-emerald-700 flex items-center">
                      Join &rarr;
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

