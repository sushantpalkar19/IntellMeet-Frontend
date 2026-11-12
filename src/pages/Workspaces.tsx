import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { WorkspaceRole } from '../services/workspaceApi';
import DashboardNavbar from '../components/layout/DashboardNavbar';
import WorkspaceEmptyState from '../components/workspaces/WorkspaceEmptyState';

export default function Workspaces() {
  const navigate = useNavigate();
  const { workspaces, isLoading, error, fetchWorkspaces, createWorkspace, clearError } =
    useWorkspaceStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await createWorkspace(formData.name, formData.description);
      setShowCreateForm(false);
      setFormData({ name: '', description: '' });
    } catch {
      // Error handled by store
    }
  };

  const getRoleBadgeColor = (role: WorkspaceRole) => {
    switch (role) {
      case WorkspaceRole.OWNER:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300';
      case WorkspaceRole.ADMIN:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300';
      case WorkspaceRole.MEMBER:
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300';
      case WorkspaceRole.VIEWER:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3FF] dark:bg-[#0B0B14] transition-colors duration-200">
      {/* Top Navigation */}
      <DashboardNavbar activeTab="workspaces" />

      <main className="w-full py-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-stagger-1">
        {/* Page Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-widest">
              Workspace Management
            </p>
            <h1 className="text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              Your Workspaces{workspaces.length > 0 && (
                <span className="ml-2 text-2xl font-bold text-purple-500 dark:text-[#C4B5FD]">
                  ({workspaces.length})
                </span>
              )}
            </h1>
            <p className="text-sm text-[#64748B] dark:text-slate-400">
              Bring your team together and collaborate in one place.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center px-5 py-2.5 bg-[#6D28D9] hover:bg-[#5B21B6] dark:bg-[#7C3AED] dark:hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-xl shadow-md shadow-purple-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6D28D9] active:scale-[0.985] transition-all"
            aria-label={showCreateForm ? 'Cancel creating workspace' : 'Create new workspace'}
          >
            {showCreateForm ? '✕ Cancel' : '+ Create Workspace'}
          </button>
        </header>

        {/* Global API error */}
        {error && (
          <div
            role="alert"
            className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm"
          >
            {error}
          </div>
        )}

        {/* Create Workspace Form */}
        {showCreateForm && (
          <div className="bg-white dark:bg-[#151522] border border-purple-100/70 dark:border-purple-900/30 shadow-sm rounded-2xl p-6 animate-card-entrance">
            <h2 className="text-lg font-semibold text-[#0F172A] dark:text-white mb-5">
              Create New Workspace
            </h2>
            <form onSubmit={handleCreate} noValidate>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="ws-name"
                    className="block text-sm font-medium text-[#64748B] dark:text-slate-400 mb-1"
                  >
                    Workspace Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="ws-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-[#0B0B14] text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-transparent text-sm transition"
                    placeholder="e.g. Engineering · Design · Marketing"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="ws-description"
                    className="block text-sm font-medium text-[#64748B] dark:text-slate-400 mb-1"
                  >
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="ws-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="block w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-[#0B0B14] text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-transparent text-sm transition"
                    rows={3}
                    placeholder="What will this workspace be used for?"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setFormData({ name: '', description: '' });
                      clearError();
                    }}
                    className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl text-[#64748B] dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1C1C2E] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !formData.name.trim() || !formData.description.trim()}
                    className="px-5 py-2 text-sm font-semibold bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isLoading ? 'Creating…' : 'Create Workspace'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Workspace List / Loading / Empty */}
        {isLoading && workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-9 h-9 rounded-full border-[3px] border-[#6D28D9] border-t-transparent animate-spin" />
            <p className="mt-4 text-sm text-[#64748B] dark:text-slate-400">
              Loading your workspaces…
            </p>
          </div>
        ) : workspaces.length === 0 ? (
          <WorkspaceEmptyState onCreate={() => setShowCreateForm(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                onClick={() => navigate(`/workspaces/${workspace.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate(`/workspaces/${workspace.id}`);
                }}
                className="group bg-white dark:bg-[#151522] border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 rounded-2xl p-5 cursor-pointer shadow-sm hover:shadow-md transition-all flex flex-col justify-between outline-none focus-visible:ring-2 focus-visible:ring-[#6D28D9]"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-bold text-[#0F172A] dark:text-white group-hover:text-[#6D28D9] dark:group-hover:text-[#C4B5FD] transition-colors line-clamp-1">
                      {workspace.name}
                    </h3>
                    <span
                      className={`ml-2 shrink-0 px-2 py-0.5 text-[11px] font-semibold rounded-full ${getRoleBadgeColor(
                        workspace.role
                      )}`}
                    >
                      {workspace.role}
                    </span>
                  </div>
                  <p className="text-sm text-[#64748B] dark:text-slate-400 line-clamp-2">
                    {workspace.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-700 dark:text-[#C4B5FD]">
                    Open Workspace →
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {new Date(workspace.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
