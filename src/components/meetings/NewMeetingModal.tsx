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
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-meeting-title"
    >
      <div className="bg-[#171525] text-white rounded-2xl shadow-2xl border border-purple-900/40 max-w-lg w-full p-6 sm:p-7 text-left relative transform transition-all animate-card-entrance">
        {/* Modal Header */}
        <div className="flex justify-between items-start pb-4 border-b border-purple-900/30">
          <div>
            <h2 id="new-meeting-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Create New Meeting
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Set up an instant team sync or schedule a future collaboration.
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

        {/* Information Banner */}
        <div className="mt-4 p-3.5 bg-purple-950/40 border border-purple-800/40 rounded-xl flex items-start space-x-3">
          <svg className="w-5 h-5 text-[#C4B5FD] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-purple-200 leading-relaxed">
            <span className="font-semibold text-white">Workspace meeting:</span> This creates a meeting in the selected workspace. Use Calendar for time zone, invitee, agenda and reminder options.
          </p>
        </div>

        {validationError && (
          <div className="mt-3.5 p-3 bg-red-950/50 border border-red-800/60 text-red-200 text-sm rounded-xl flex items-center space-x-2">
            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{validationError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Meeting Type Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Meeting Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMeetingType('instant')}
                className={`py-2.5 px-3.5 text-xs sm:text-sm font-medium rounded-xl border flex items-center justify-center space-x-2 transition-all ${
                  meetingType === 'instant'
                    ? 'border-[#7C3AED] bg-purple-950/70 text-white font-semibold ring-1 ring-[#7C3AED] shadow-sm shadow-purple-950'
                    : 'border-slate-800 bg-[#12111E] text-slate-300 hover:text-white hover:bg-[#1B182B] hover:border-slate-700'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                <span>Start Now (Instant)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/calendar?${workspaceId ? `workspaceId=${encodeURIComponent(workspaceId)}&` : ''}create=1`);
                }}
                className={`py-2.5 px-3.5 text-xs sm:text-sm font-medium rounded-xl border flex items-center justify-center space-x-2 transition-all ${
                  meetingType === 'scheduled'
                    ? 'border-[#7C3AED] bg-purple-950/70 text-white font-semibold ring-1 ring-[#7C3AED] shadow-sm shadow-purple-950'
                    : 'border-slate-800 bg-[#12111E] text-slate-300 hover:text-white hover:bg-[#1B182B] hover:border-slate-700'
                }`}
              >
                <svg className="w-4 h-4 text-[#C4B5FD]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Schedule with options</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="meeting-title" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Meeting Title <span className="text-red-400">*</span>
            </label>
            <input
              id="meeting-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Weekly Sprint Planning"
              className="w-full px-3.5 py-2.5 bg-[#12111E] border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/25 transition-all"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="meeting-description" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Description <span className="text-slate-500 font-normal normal-case">(Optional)</span>
            </label>
            <textarea
              id="meeting-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief agenda or purpose of this meeting..."
              className="w-full px-3.5 py-2.5 bg-[#12111E] border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/25 transition-all resize-none"
            />
          </div>

          {/* Scheduled Date/Time Picker */}
          {meetingType === 'scheduled' && (
            <div>
              <label htmlFor="scheduled-time" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Date &amp; Time <span className="text-red-400">*</span>
              </label>
              <input
                id="scheduled-time"
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#12111E] border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/25 transition-all"
                required
              />
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-purple-900/30 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 border border-slate-700/80 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-slate-600 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#6D28D9] hover:bg-[#5B21B6] dark:bg-[#7C3AED] dark:hover:bg-[#6D28D9] text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-950/40 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 focus:ring-offset-[#171525] active:scale-[0.985] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center transition-all"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Creating...</span>
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
