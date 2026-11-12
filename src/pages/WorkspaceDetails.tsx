import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { WorkspaceRole } from '../services/workspaceApi';
import DashboardNavbar from '../components/layout/DashboardNavbar';
import MeetingList from '../components/meetings/MeetingList';
import RecordingLibrary from '../components/meetings/RecordingLibrary';
import WorkspaceProjectBoard from '../components/tasks/WorkspaceProjectBoard';

export default function WorkspaceDetails() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'meetings' | 'recordings' | 'projects' | 'members'>('meetings');
  const {
    currentWorkspace,
    members,
    isLoading,
    error,
    fetchWorkspace,
    fetchMembers,
    updateWorkspace,
    deleteWorkspace,
    addMember,
    updateMemberRole,
    removeMember,
    clearError,
  } = useWorkspaceStore();

  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', description: '' });
  const [addMemberFormData, setAddMemberFormData] = useState({
    email: '',
    password: '',
    role: 'member' as 'member' | 'admin' | 'viewer',
  });
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [memberSuccess, setMemberSuccess] = useState('');

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspace(workspaceId);
      fetchMembers(workspaceId);
    }
  }, [workspaceId, fetchWorkspace, fetchMembers]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    clearError();
    try {
      await updateWorkspace(workspaceId, editFormData.name, editFormData.description);
      setShowEditForm(false);
    } catch {
      // Error handled by store
    }
  };

  const handleDelete = async () => {
    if (
      !workspaceId ||
      !confirm('Are you sure you want to delete this workspace? This action cannot be undone.')
    )
      return;
    clearError();
    try {
      await deleteWorkspace(workspaceId);
      navigate('/workspaces');
    } catch {
      // Error handled by store
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    clearError();
    try {
      const result = await addMember(workspaceId, addMemberFormData.email, addMemberFormData.password, addMemberFormData.role);
      setMemberSuccess(result.message);
      setShowAddMemberForm(false);
      setAddMemberFormData({ email: '', password: '', role: WorkspaceRole.MEMBER });
    } catch {
      // Error handled by store
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!workspaceId || !confirm('Are you sure you want to remove this member?')) return;
    clearError();
    try {
      await removeMember(workspaceId, memberId);
    } catch {
      // Error handled by store
    }
  };

  const handleRoleChange = async (memberId: string, newRole: WorkspaceRole) => {
    if (!workspaceId) return;
    clearError();
    try {
      await updateMemberRole(workspaceId, memberId, newRole);
    } catch {
      // Error handled by store
    }
  };

  const getRoleBadgeColor = (role: WorkspaceRole) => {
    switch (role) {
      case WorkspaceRole.OWNER:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800/50';
      case WorkspaceRole.ADMIN:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800/50';
      case WorkspaceRole.MEMBER:
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50';
      case WorkspaceRole.VIEWER:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const canEdit =
    currentWorkspace?.role === WorkspaceRole.OWNER ||
    currentWorkspace?.role === WorkspaceRole.ADMIN;
  const canDelete = currentWorkspace?.role === WorkspaceRole.OWNER;
  const canManageMembers =
    currentWorkspace?.role === WorkspaceRole.OWNER ||
    currentWorkspace?.role === WorkspaceRole.ADMIN;
  const canChangeRoles = currentWorkspace?.role === WorkspaceRole.OWNER;

  // Workspace icon initials
  const workspaceInitials = currentWorkspace?.name
    ? currentWorkspace.name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : 'WS';

  // ─── Not Found ────────────────────────────────────────────────────────────
  if (!currentWorkspace && !isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F3FF] dark:bg-[#0B0B14] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 dark:bg-purple-950/80 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-purple-600 dark:text-[#C4B5FD]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#0F172A] dark:text-white mb-2">Workspace not found</h2>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mb-5">This workspace doesn't exist or you don't have access.</p>
          <button
            onClick={() => navigate('/workspaces')}
            className="px-5 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            Back to Workspaces
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3FF] dark:bg-[#0B0B14] transition-colors duration-200">
      {/* Shared Navbar */}
      <DashboardNavbar activeTab="workspaces" />

      <main className="w-full py-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-stagger-1">

        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-xs text-[#64748B] dark:text-slate-400" aria-label="Breadcrumb">
          <Link to="/workspaces" className="hover:text-[#6D28D9] dark:hover:text-[#C4B5FD] transition-colors font-medium">
            Workspaces
          </Link>
          <svg className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-[#0F172A] dark:text-white font-semibold truncate max-w-[200px]">
            {currentWorkspace?.name || '…'}
          </span>
        </nav>

        {/* Loading skeleton */}
        {isLoading && !currentWorkspace ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-9 h-9 rounded-full border-[3px] border-[#6D28D9] border-t-transparent animate-spin" />
            <p className="mt-4 text-sm text-[#64748B] dark:text-slate-400">Loading workspace…</p>
          </div>
        ) : (
          <>
            {/* Global error */}
            {error && (
              <div role="alert" className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* ── Workspace Header Card ─────────────────────────────────── */}
            <div className="bg-white dark:bg-[#151522] border border-purple-100/70 dark:border-purple-900/30 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Workspace avatar */}
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6D28D9] to-[#5B21B6] flex items-center justify-center shadow-md shadow-purple-900/20">
                  <span className="text-white font-extrabold text-lg tracking-tight">{workspaceInitials}</span>
                </div>

                {/* Name / description / meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white tracking-tight truncate">
                      {currentWorkspace?.name}
                    </h1>
                    {currentWorkspace?.role && (
                      <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${getRoleBadgeColor(currentWorkspace.role)}`}>
                        {currentWorkspace.role}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#64748B] dark:text-slate-400 line-clamp-2">
                    {currentWorkspace?.description || 'No description provided.'}
                  </p>
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                    Created {new Date(currentWorkspace?.createdAt || '').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditForm(true);
                        setEditFormData({
                          name: currentWorkspace?.name || '',
                          description: currentWorkspace?.description || '',
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F172A] dark:text-slate-200 bg-white dark:bg-[#1C1C2E] border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 rounded-xl shadow-sm transition-all"
                    >
                      <svg className="w-3.5 h-3.5 text-purple-600 dark:text-[#C4B5FD]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 bg-white dark:bg-[#1C1C2E] border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl shadow-sm transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Edit Form (inline) */}
              {showEditForm && (
                <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 animate-card-entrance">
                  <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white mb-4">Edit Workspace</h3>
                  <form onSubmit={handleUpdate} className="space-y-3">
                    <div>
                      <label htmlFor="edit-name" className="block text-xs font-medium text-[#64748B] dark:text-slate-400 mb-1">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="edit-name"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="block w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-[#0B0B14] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9] transition"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-description" className="block text-xs font-medium text-[#64748B] dark:text-slate-400 mb-1">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="edit-description"
                        value={editFormData.description}
                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                        className="block w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-[#0B0B14] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9] transition"
                        rows={3}
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => { setShowEditForm(false); clearError(); }}
                        className="px-4 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl text-[#64748B] dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1C1C2E] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-5 py-2 text-xs font-semibold bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-xl shadow-sm disabled:opacity-50 transition-all"
                      >
                        {isLoading ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* ── Tabs ──────────────────────────────────────────────────── */}
            <div className="border-b border-slate-200 dark:border-slate-800">
              <nav className="-mb-px flex space-x-1" aria-label="Workspace Sections">
                {/* Meetings Tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('meetings')}
                  className={`group inline-flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6D28D9] ${
                    activeTab === 'meetings'
                      ? 'border-[#6D28D9] text-[#6D28D9] dark:text-[#C4B5FD] dark:border-[#C4B5FD]'
                      : 'border-transparent text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Meetings
                  <span className={`px-1.5 py-0.5 text-[10px] rounded font-semibold ${
                    activeTab === 'meetings'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-[#C4B5FD]'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    UI Preview
                  </span>
                </button>

                <button type="button" onClick={() => setActiveTab('recordings')} className={`group inline-flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6D28D9] ${activeTab === 'recordings' ? 'border-[#6D28D9] text-[#6D28D9] dark:text-[#C4B5FD] dark:border-[#C4B5FD]' : 'border-transparent text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'}`}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="2"/><path d="m10 9 5 3-5 3V9Z" strokeWidth="2" strokeLinejoin="round"/></svg>
                  Recordings
                </button>

                <button type="button" onClick={() => setActiveTab('projects')} className={`group inline-flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6D28D9] ${activeTab === 'projects' ? 'border-[#6D28D9] text-[#6D28D9] dark:text-[#C4B5FD] dark:border-[#C4B5FD]' : 'border-transparent text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'}`}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 6h6v5H4zM14 6h6v5h-6zM4 15h6v5H4zM14 15h6v5h-6z" strokeWidth="2" strokeLinejoin="round"/></svg>
                  Projects
                </button>

                {/* Members Tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('members')}
                  className={`group inline-flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6D28D9] ${
                    activeTab === 'members'
                      ? 'border-[#6D28D9] text-[#6D28D9] dark:text-[#C4B5FD] dark:border-[#C4B5FD]'
                      : 'border-transparent text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Team Members
                  <span className={`px-1.5 py-0.5 text-[10px] rounded font-semibold ${
                    activeTab === 'members'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-[#C4B5FD]'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {members.length}
                  </span>
                </button>
              </nav>
            </div>

            {/* ── Tab Panels ────────────────────────────────────────────── */}
            {activeTab === 'meetings' ? (
              <MeetingList
                workspaceId={workspaceId || ''}
                workspaceName={currentWorkspace?.name}
                canCreateMeeting={currentWorkspace?.role !== WorkspaceRole.VIEWER}
                currentUser={user || undefined}
              />
            ) : activeTab === 'recordings' ? (
              <RecordingLibrary workspaceId={workspaceId || ''} />
            ) : activeTab === 'projects' ? (
              <WorkspaceProjectBoard workspaceId={workspaceId || ''} members={members} role={currentWorkspace?.role} />
            ) : (
              /* ── Members Panel ──────────────────────────────────────── */
              <div className="bg-white dark:bg-[#151522] border border-purple-100/70 dark:border-purple-900/30 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
                      Team Members
                      <span className="ml-2 text-sm font-normal text-[#64748B] dark:text-slate-400">({members.length})</span>
                    </h2>
                    <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">Manage access and roles for this workspace.</p>
                  </div>
                  {canManageMembers && (
                    <button
                      type="button"
                      onClick={() => setShowAddMemberForm(!showAddMemberForm)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-xl shadow-sm transition-colors"
                    >
                      {showAddMemberForm ? '✕ Cancel' : '+ Add Member'}
                    </button>
                  )}
                </div>

                {/* Add Member Form */}
                {showAddMemberForm && (
                  <div className="mb-5 p-4 bg-[#F5F3FF] dark:bg-[#1C1C2E] rounded-xl border border-purple-100 dark:border-purple-900/40 animate-card-entrance">
                    <form onSubmit={handleAddMember} className="space-y-3">
                      <div>
                        <label htmlFor="member-email" className="block text-xs font-medium text-[#64748B] dark:text-slate-400 mb-1">
                          Email address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          id="member-email"
                          value={addMemberFormData.email}
                          onChange={(e) => setAddMemberFormData({ ...addMemberFormData, email: e.target.value })}
                          className="block w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-[#0B0B14] text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] transition"
                          placeholder="colleague@company.com"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="member-password" className="block text-xs font-medium text-[#64748B] dark:text-slate-400 mb-1">
                          Temporary password <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type={showTemporaryPassword ? 'text' : 'password'}
                            id="member-password"
                            value={addMemberFormData.password}
                            onChange={(e) => setAddMemberFormData({ ...addMemberFormData, password: e.target.value })}
                            minLength={8}
                            pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}"
                            title="Use at least 8 characters with uppercase, lowercase, and a number."
                            autoComplete="new-password"
                            className="block w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-[#0B0B14] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9] transition"
                            required
                          />
                          <button type="button" onClick={() => setShowTemporaryPassword((shown) => !shown)} className="px-3 text-xs text-[#6D28D9]" aria-label={showTemporaryPassword ? 'Hide password' : 'Show password'}>
                            {showTemporaryPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">At least 8 characters, including uppercase, lowercase, and a number.</p>
                      </div>
                      <div>
                        <label htmlFor="member-role" className="block text-xs font-medium text-[#64748B] dark:text-slate-400 mb-1">Role</label>
                        <select
                          id="member-role"
                          value={addMemberFormData.role}
                          onChange={(e) => setAddMemberFormData({ ...addMemberFormData, role: e.target.value as 'member' | 'admin' | 'viewer' })}
                          className="block w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-[#0B0B14] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9] transition"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddMemberForm(false);
                            setAddMemberFormData({ email: '', password: '', role: WorkspaceRole.MEMBER });
                            clearError();
                          }}
                          className="px-4 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl text-[#64748B] dark:text-slate-400 hover:bg-white dark:hover:bg-[#0B0B14] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="px-5 py-2 text-xs font-semibold bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-xl shadow-sm disabled:opacity-50 transition-all"
                        >
                          {isLoading ? 'Adding…' : 'Add Member'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                {memberSuccess && <p role="status" className="mb-4 text-sm text-emerald-600">{memberSuccess}</p>}

                {/* Member List */}
                {members.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    <p className="text-sm text-[#64748B] dark:text-slate-400">No members yet.</p>
                    {canManageMembers && (
                      <button
                        type="button"
                        onClick={() => setShowAddMemberForm(true)}
                        className="mt-3 text-xs font-semibold text-[#6D28D9] dark:text-[#C4B5FD] hover:underline"
                      >
                        Add your first member →
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1C1C2E]/50 hover:border-purple-200 dark:hover:border-purple-800/40 transition-colors"
                      >
                        {/* Avatar + Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-[#6D28D9] to-[#8B5CF6] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                            {member.firstName?.[0]}{member.lastName?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#0F172A] dark:text-white truncate">
                              {member.firstName} {member.lastName}
                              {user?.email === member.email && (
                                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-[#C4B5FD] rounded font-semibold">You</span>
                              )}
                            </p>
                            <p className="text-xs text-[#64748B] dark:text-slate-400 truncate">{member.email}</p>
                          </div>
                        </div>

                        {/* Role + Remove */}
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {canChangeRoles && member.role !== WorkspaceRole.OWNER ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.id, e.target.value as WorkspaceRole)}
                              className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-[#0B0B14] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9] transition"
                            >
                              <option value={WorkspaceRole.ADMIN}>Admin</option>
                              <option value={WorkspaceRole.MEMBER}>Member</option>
                              <option value={WorkspaceRole.VIEWER}>Viewer</option>
                            </select>
                          ) : (
                            <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${getRoleBadgeColor(member.role)}`}>
                              {member.role}
                            </span>
                          )}

                          {canManageMembers && member.role !== WorkspaceRole.OWNER && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              aria-label={`Remove ${member.firstName} ${member.lastName}`}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
