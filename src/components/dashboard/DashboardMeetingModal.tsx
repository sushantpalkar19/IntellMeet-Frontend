import { useNavigate } from 'react-router-dom';
import type { Workspace } from '../../services/workspaceApi';

interface DashboardMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: Workspace[];
  actionType: 'new' | 'schedule';
}

export default function DashboardMeetingModal({
  isOpen,
  onClose,
  workspaces,
  actionType,
}: DashboardMeetingModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSelectWorkspace = (workspaceId: string) => {
    onClose();
    navigate(actionType === 'schedule' ? `/calendar?workspaceId=${encodeURIComponent(workspaceId)}&create=1` : `/workspaces/${workspaceId}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meeting-modal-title"
    >
      <div className="bg-white dark:bg-[#151522] rounded-2xl shadow-2xl border border-purple-100 dark:border-purple-900/40 max-w-lg w-full p-6 text-left relative transform transition-all animate-card-entrance">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-[#C4B5FD]">
                {actionType === 'new' ? 'Instant Meeting' : 'Schedule Meeting'}
              </span>
            </div>
            <h2 id="meeting-modal-title" className="text-xl font-bold text-[#0F172A] dark:text-white">
              Select Workspace for Meeting
            </h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              In IntellMeet, meetings are organized within dedicated team workspaces.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Informative Note */}
        <div className="my-4 p-3.5 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800/40 rounded-xl flex items-start space-x-2.5">
          <svg className="w-4 h-4 text-purple-600 dark:text-[#C4B5FD] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-purple-900 dark:text-purple-200 leading-relaxed">
            <strong className="font-semibold">Workspace Context:</strong> Select a workspace to open its meetings. Use Calendar for time zones, invitees, agendas and reminders.
          </p>
        </div>

        {/* Workspace List */}
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {workspaces.length === 0 ? (
            <div className="text-center py-8 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                You do not have any active workspaces yet.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/workspaces');
                }}
                className="px-3.5 py-1.5 bg-[#6D28D9] dark:bg-[#7C3AED] text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-[#5B21B6]"
              >
                Create Workspace First
              </button>
            </div>
          ) : (
            workspaces.map((ws) => (
              <button
                key={ws.id}
                type="button"
                onClick={() => handleSelectWorkspace(ws.id)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 bg-white dark:bg-[#1C1C2E] text-left flex items-center justify-between group transition-all"
              >
                <div>
                  <h4 className="text-sm font-semibold text-[#0F172A] dark:text-white group-hover:text-[#6D28D9] dark:group-hover:text-[#C4B5FD] transition-colors">
                    {ws.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {ws.description || 'No description provided.'}
                  </p>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 capitalize">
                    {ws.role}
                  </span>
                  <span className="text-purple-600 dark:text-[#C4B5FD] font-semibold text-xs group-hover:translate-x-0.5 transition-transform">
                    Select &rarr;
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

