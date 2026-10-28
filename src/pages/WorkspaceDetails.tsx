import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { WorkspaceRole } from '../services/workspaceApi';

export default function WorkspaceDetails() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
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
  const [addMemberFormData, setAddMemberFormData] = useState({ email: '', role: 'member' as 'member' | 'admin' | 'viewer' });

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
    } catch (error) {
      // Error handled by store
    }
  };

  const handleDelete = async () => {
    if (!workspaceId || !confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) return;
    clearError();
    try {
      await deleteWorkspace(workspaceId);
      navigate('/workspaces');
    } catch (error) {
      // Error handled by store
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    clearError();
    try {
      await addMember(workspaceId, addMemberFormData.email, addMemberFormData.role);
      setShowAddMemberForm(false);
      setAddMemberFormData({ email: '', role: WorkspaceRole.MEMBER });
    } catch (error) {
      // Error handled by store
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!workspaceId || !confirm('Are you sure you want to remove this member?')) return;
    clearError();
    try {
      await removeMember(workspaceId, memberId);
    } catch (error) {
      // Error handled by store
    }
  };

  const handleRoleChange = async (memberId: string, newRole: WorkspaceRole) => {
    if (!workspaceId) return;
    clearError();
    try {
      await updateMemberRole(workspaceId, memberId, newRole);
    } catch (error) {
      // Error handled by store
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeColor = (role: WorkspaceRole) => {
    switch (role) {
      case WorkspaceRole.OWNER:
        return 'bg-purple-100 text-purple-800';
      case WorkspaceRole.ADMIN:
        return 'bg-blue-100 text-blue-800';
      case WorkspaceRole.MEMBER:
        return 'bg-green-100 text-green-800';
      case WorkspaceRole.VIEWER:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canEdit = currentWorkspace?.role === WorkspaceRole.OWNER || currentWorkspace?.role === WorkspaceRole.ADMIN;
  const canDelete = currentWorkspace?.role === WorkspaceRole.OWNER;
  const canManageMembers = currentWorkspace?.role === WorkspaceRole.OWNER || currentWorkspace?.role === WorkspaceRole.ADMIN;
  const canChangeRoles = currentWorkspace?.role === WorkspaceRole.OWNER;

  if (!currentWorkspace && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Workspace not found</h2>
          <button
            onClick={() => navigate('/workspaces')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Back to Workspaces
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/workspaces')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">IntellMeet</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user?.firstName} {user?.lastName}</span>
              <button
                onClick={handleLogout}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {isLoading && !currentWorkspace ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
                  {error}
                </div>
              )}

              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{currentWorkspace?.name}</h2>
                    <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(currentWorkspace?.role!)}`}>
                      {currentWorkspace?.role}
                    </span>
                  </div>
                  <div className="space-x-2">
                    {canEdit && (
                      <button
                        onClick={() => {
                          setShowEditForm(true);
                          setEditFormData({ name: currentWorkspace?.name || '', description: currentWorkspace?.description || '' });
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-gray-600">{currentWorkspace?.description}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Created {new Date(currentWorkspace?.createdAt || '').toLocaleDateString()}
                </p>
              </div>

              {showEditForm && (
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Workspace</h3>
                  <form onSubmit={handleUpdate}>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
                          Workspace Name
                        </label>
                        <input
                          type="text"
                          id="edit-name"
                          value={editFormData.name}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <textarea
                          id="edit-description"
                          value={editFormData.description}
                          onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          rows={3}
                          required
                        />
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowEditForm(false);
                            clearError();
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Team Members ({members.length})</h3>
                  {canManageMembers && (
                    <button
                      onClick={() => setShowAddMemberForm(!showAddMemberForm)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                    >
                      {showAddMemberForm ? 'Cancel' : 'Add Member'}
                    </button>
                  )}
                </div>

                {showAddMemberForm && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <form onSubmit={handleAddMember}>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="member-email" className="block text-sm font-medium text-gray-700">
                            Email
                          </label>
                          <input
                            type="email"
                            id="member-email"
                            value={addMemberFormData.email}
                            onChange={(e) => setAddMemberFormData({ ...addMemberFormData, email: e.target.value })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="user@example.com"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="member-role" className="block text-sm font-medium text-gray-700">
                            Role
                          </label>
                          <select
                            id="member-role"
                            value={addMemberFormData.role}
                            onChange={(e) => setAddMemberFormData({ ...addMemberFormData, role: e.target.value as any })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </div>
                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddMemberForm(false);
                              setAddMemberFormData({ email: '', role: WorkspaceRole.MEMBER });
                              clearError();
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {isLoading ? 'Adding...' : 'Add Member'}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                {members.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No members yet</p>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-medium">
                              {member.firstName[0]}{member.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-sm text-gray-600">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {canChangeRoles && member.role !== WorkspaceRole.OWNER ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.id, e.target.value as WorkspaceRole)}
                              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500"
                            >
                              <option value={WorkspaceRole.ADMIN}>Admin</option>
                              <option value={WorkspaceRole.MEMBER}>Member</option>
                              <option value={WorkspaceRole.VIEWER}>Viewer</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(member.role)}`}>
                              {member.role}
                            </span>
                          )}
                          {canManageMembers && member.role !== WorkspaceRole.OWNER && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
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
            </>
          )}
        </div>
      </main>
    </div>
  );
}
