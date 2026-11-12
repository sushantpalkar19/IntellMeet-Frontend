import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CreateMeetingInput } from '../../types/meeting';

interface NewMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: CreateMeetingInput) => Promise<void>;
  workspaceId?: string;
}

// Default scheduled time helper (defined outside component for purity)
function getDefaultDateTime(): string {
  const nextHour = new Date(Date.now() + 60 * 60 * 1000);
  nextHour.setMinutes(0, 0, 0);
  return new Date(nextHour.getTime() - nextHour.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export default function NewMeetingModal({ isOpen, onClose, onCreate, workspaceId }: NewMeetingModalProps) {
  const navigate = useNavigate();
  const [meetingType, setMeetingType] = useState<'instant' | 'scheduled'>('instant');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledFor, setScheduledFor] = useState(getDefaultDateTime);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setValidationError('Meeting title is required.');
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);

    try {
      const finalScheduledTime =
        meetingType === 'instant' ? new Date().toISOString() : new Date(scheduledFor).toISOString();

      await onCreate({
        workspaceId: workspaceId || '',
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledAt: meetingType === 'instant' ? undefined : finalScheduledTime,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setMeetingType('instant');
      onClose();
    } catch {
      setValidationError('Failed to create meeting. Please check the workspace and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-meeting-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 text-left relative transform transition-all">
        {/* Modal Header */}
        <div className="flex justify-between items-start pb-4 border-b border-gray-100">
          <div>
            <h2 id="new-meeting-title" className="text-xl font-bold text-gray-900">
              Create New Meeting
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Set up an instant team sync or schedule a future collaboration.
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

        {/* UI Scope Notice */}
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md flex items-start space-x-2">
          <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-purple-800 leading-relaxed">
            <span className="font-semibold">Workspace meeting:</span> This creates a meeting in the selected workspace. Use Calendar for time zone, invitee, agenda and reminder options.
          </p>
        </div>

        {validationError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
            {validationError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Meeting Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMeetingType('instant')}
                className={`py-2 px-3 text-sm font-medium rounded-lg border flex items-center justify-center space-x-2 transition-all ${
                  meetingType === 'instant'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>Start Now (Instant)</span>
              </button>

              <button
                type="button"
                onClick={() => { onClose(); navigate(`/calendar?${workspaceId ? `workspaceId=${encodeURIComponent(workspaceId)}&` : ''}create=1`); }}
                className={`py-2 px-3 text-sm font-medium rounded-lg border flex items-center justify-center space-x-2 transition-all ${
                  meetingType === 'scheduled'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Schedule with options</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="meeting-title" className="block text-sm font-medium text-gray-700 mb-1">
              Meeting Title <span className="text-red-500">*</span>
            </label>
            <input
              id="meeting-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Weekly Sprint Planning"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="meeting-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="meeting-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief agenda or purpose of this meeting..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* Scheduled Date/Time Picker */}
          {meetingType === 'scheduled' && (
            <div>
              <label htmlFor="scheduled-time" className="block text-sm font-medium text-gray-700 mb-1">
                Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                id="scheduled-time"
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                required
              />
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 inline-flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : meetingType === 'instant' ? (
                'Start Instant Meeting'
              ) : (
                'Schedule Meeting'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
