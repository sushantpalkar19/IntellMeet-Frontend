import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { WorkspaceRole } from '../services/workspaceApi';
import DashboardNavbar from '../components/layout/DashboardNavbar';
import DashboardMeetingModal from '../components/dashboard/DashboardMeetingModal';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { workspaces, isLoading, error, fetchWorkspaces } = useWorkspaceStore();
  const navigate = useNavigate();

  const [meetingModal, setMeetingModal] = useState<{
    isOpen: boolean;
    type: 'new' | 'schedule';
  }>({
    isOpen: false,
    type: 'new',
  });

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Dynamic time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const getRoleBadgeColor = (role: WorkspaceRole) => {
    switch (role) {
      case WorkspaceRole.OWNER:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800/40';
      case WorkspaceRole.ADMIN:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800/40';
      case WorkspaceRole.MEMBER:
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/40';
      case WorkspaceRole.VIEWER:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const primaryWorkspace = workspaces[0];

  return (
    <div className="min-h-screen bg-[#F5F3FF] dark:bg-[#0B0B14] transition-colors duration-200">
      {/* Top Navigation */}
      <DashboardNavbar
        activeTab="dashboard"
        onNewMeetingClick={() => setMeetingModal({ isOpen: true, type: 'new' })}
      />

      <main className="w-full py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-stagger-1">
        {/* Welcome Banner */}
        <section className="bg-white dark:bg-[#151522] rounded-2xl p-6 sm:p-8 shadow-sm border border-purple-100/80 dark:border-purple-900/30 transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-[#C4B5FD] mb-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>IntellMeet Enterprise</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              {greeting}, {user?.firstName || 'there'}!
            </h1>
            <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">
              Bring your team together and get more done.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setMeetingModal({ isOpen: true, type: 'new' })}
              className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] dark:bg-[#7C3AED] dark:hover:bg-[#6D28D9] shadow-md shadow-purple-900/20 active:scale-[0.985] transition-all"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              New Meeting
            </button>

            <button
              type="button"
              onClick={() => setMeetingModal({ isOpen: true, type: 'schedule' })}
              className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-[#0F172A] dark:text-white bg-white dark:bg-[#1C1C2E] border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 shadow-sm transition-all"
            >
              <svg className="w-4 h-4 mr-2 text-purple-600 dark:text-[#C4B5FD]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Schedule Meeting
            </button>

            <Link to="/analytics" className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-[#0F172A] dark:text-white bg-white dark:bg-[#1C1C2E] border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 shadow-sm transition-all">
              Analytics
            </Link>
          </div>
        </section>

        {/* Summary Metric Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Workspaces Metric (Real Data) */}
          <div className="bg-white dark:bg-[#151522] rounded-2xl p-5 border border-purple-100/70 dark:border-purple-900/30 shadow-sm transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
                Workspaces
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-[#C4B5FD] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-[#0F172A] dark:text-white">
              {isLoading ? (
                <span className="inline-block w-8 h-6 bg-slate-100 dark:bg-slate-800 animate-pulse rounded"></span>
              ) : (
                workspaces.length
              )}
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
              Active team environments
            </p>
            <Link
              to="/workspaces"
              className="mt-3.5 inline-flex items-center text-xs font-semibold text-[#6D28D9] dark:text-[#C4B5FD] hover:underline"
            >
              View workspaces &rarr;
            </Link>
          </div>

          {/* Account Profile Status (Real Data) */}
          <div className="bg-white dark:bg-[#151522] rounded-2xl p-5 border border-purple-100/70 dark:border-purple-900/30 shadow-sm transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
                Identity &amp; Role
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <div className="text-base font-bold text-[#0F172A] dark:text-white truncate">
              {user?.firstName} {user?.lastName}
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 truncate">
              {user?.email}
            </p>
            <span className="mt-3 inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
              Active Session
            </span>
          </div>

          {/* Meeting Stats (Honest Empty / Scheduled State) */}
          <div className="bg-white dark:bg-[#151522] rounded-2xl p-5 border border-purple-100/70 dark:border-purple-900/30 shadow-sm transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
                Meetings
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-[#C4B5FD]">
                Phase 6 UI
              </span>
            </div>
            <div className="text-2xl font-bold text-[#0F172A] dark:text-white">
              —
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
              Live metrics connect in Phase 6 backend
            </p>
            {primaryWorkspace ? (
              <Link
                to={`/workspaces/${primaryWorkspace.id}`}
                className="mt-3.5 inline-flex items-center text-xs font-semibold text-[#6D28D9] dark:text-[#C4B5FD] hover:underline"
              >
                Workspace Meetings UI &rarr;
              </Link>
            ) : (
              <span className="mt-3.5 inline-block text-xs text-slate-400">Available inside workspaces</span>
            )}
          </div>

          {/* AI Insights & Action Items (Honest Placeholder) */}
          <div className="bg-white dark:bg-[#151522] rounded-2xl p-5 border border-purple-100/70 dark:border-purple-900/30 shadow-sm transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
                AI Summaries
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                Phase 5
              </span>
            </div>
            <div className="text-2xl font-bold text-[#0F172A] dark:text-white">
              —
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
              Action items and AI summaries
            </p>
            <span className="mt-3.5 inline-block text-xs text-slate-400 dark:text-slate-500">
              Awaiting backend Whisper/GPT
            </span>
          </div>
        </section>

        {/* Workspaces Section */}
        <section className="bg-white dark:bg-[#151522] rounded-2xl p-6 sm:p-8 shadow-sm border border-purple-100/80 dark:border-purple-900/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-100 dark:border-slate-800 gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#0F172A] dark:text-white">
                Your Workspaces
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                Teams and project spaces you are a member of.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                to="/workspaces"
                className="px-3.5 py-2 text-xs font-semibold rounded-xl text-purple-700 dark:text-[#C4B5FD] bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-950 border border-purple-100 dark:border-purple-900/40 transition-colors"
              >
                View all ({workspaces.length})
              </Link>
            </div>
          </div>

          <div className="mt-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#6D28D9] dark:border-[#7C3AED]"></div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 font-medium">
                  Loading your workspaces...
                </p>
              </div>
            ) : error ? (
              <div className="p-6 text-center border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 rounded-xl">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchWorkspaces()}
                  className="mt-3 px-3.5 py-1.5 text-xs font-medium rounded-lg text-red-700 dark:text-red-300 bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800"
                >
                  Retry Loading
                </button>
              </div>
            ) : workspaces.length === 0 ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <div className="w-12 h-12 mx-auto rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-[#C4B5FD] flex items-center justify-center mb-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">
                  No workspaces yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Create a workspace to collaborate with teammates, schedule meetings, and share transcripts.
                </p>
                <Link
                  to="/workspaces"
                  className="mt-4 inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-[#6D28D9] dark:bg-[#7C3AED] rounded-xl shadow-sm hover:bg-[#5B21B6]"
                >
                  Create Your First Workspace
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {workspaces.slice(0, 3).map((ws) => (
                  <div
                    key={ws.id}
                    onClick={() => navigate(`/workspaces/${ws.id}`)}
                    className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1C1C2E] hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getRoleBadgeColor(
                            ws.role
                          )}`}
                        >
                          {ws.role}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {new Date(ws.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#0F172A] dark:text-white group-hover:text-[#6D28D9] dark:group-hover:text-[#C4B5FD] transition-colors line-clamp-1">
                        {ws.name}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2">
                        {ws.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="font-semibold text-purple-700 dark:text-[#C4B5FD]">
                        Open Workspace &rarr;
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                        ID: {ws.id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Recent Meetings History Section */}
        <section className="bg-white dark:bg-[#151522] rounded-2xl p-6 sm:p-8 shadow-sm border border-purple-100/80 dark:border-purple-900/30">
          <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-[#0F172A] dark:text-white">
                  Recent Meetings
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Workspace calendar
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                Meeting history, recordings, and transcription logs.
              </p>
            </div>
          </div>

          <div className="mt-6 py-12 px-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-[#1C1C2E]/40">
            <div className="w-12 h-12 mx-auto rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-[#C4B5FD] flex items-center justify-center mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">
              No recent meeting logs
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
              Scheduled meetings, their status and invitation details are available in the Calendar and each workspace's meeting list.
            </p>
            {primaryWorkspace && (
              <button
                type="button"
                onClick={() => navigate('/calendar')}
                className="mt-4 px-4 py-2 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-[#C4B5FD] text-xs font-semibold rounded-xl hover:bg-purple-200 dark:hover:bg-purple-900 transition-colors"
              >
                Open Calendar &rarr;
              </button>
            )}
          </div>
        </section>

        {/* Platform Status & Roadmap Section */}
        <section className="bg-white dark:bg-[#151522] rounded-2xl p-6 sm:p-8 shadow-sm border border-purple-100/80 dark:border-purple-900/30">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
              IntellMeet Platform Modules
            </h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Current operational status of enterprise collaboration services.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#1C1C2E]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-[#0F172A] dark:text-white">
                  Auth &amp; JWT
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                JWT refresh, protected routes, and session persistence.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#1C1C2E]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-[#0F172A] dark:text-white">
                  Workspaces &amp; RBAC
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Workspace CRUD and multi-tier member role permissions.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#1C1C2E]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-[#0F172A] dark:text-white">
                  Real-Time Meetings
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-[#C4B5FD]">
                  Phase 6 UI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Dashboard &amp; controls UI ready; WebRTC backend pending.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#1C1C2E]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-[#0F172A] dark:text-white">
                  AI Summaries
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Phase 5
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Whisper voice-to-text &amp; GPT meeting action items.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Meeting Selection Modal */}
      <DashboardMeetingModal
        isOpen={meetingModal.isOpen}
        onClose={() => setMeetingModal({ isOpen: false, type: 'new' })}
        workspaces={workspaces}
        actionType={meetingModal.type}
      />
    </div>
  );
}
