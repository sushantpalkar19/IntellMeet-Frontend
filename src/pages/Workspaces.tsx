import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { WorkspaceRole } from '../services/workspaceApi';

export default function Workspaces() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { workspaces, isLoading, error, fetchWorkspaces, createWorkspace, clearError } = useWorkspaceStore();
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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Workspaces</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              {showCreateForm ? 'Cancel' : 'Create Workspace'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {showCreateForm && (
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Workspace</h3>
              <form onSubmit={handleCreate}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Workspace Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="My Team Workspace"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      rows={3}
                      placeholder="A workspace for our team collaboration"
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setFormData({ name: '', description: '' });
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
                      {isLoading ? 'Creating...' : 'Create Workspace'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {isLoading && workspaces.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : workspaces.length === 0 ? (
            <div className="text-center py-12 bg-white shadow rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No workspaces yet</h3>
              <p className="text-gray-600 mb-4">Create your first workspace to get started</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Create Workspace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  onClick={() => navigate(`/workspaces/${workspace.id}`)}
                  className="bg-white shadow rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{workspace.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(workspace.role)}`}>
                      {workspace.role}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{workspace.description}</p>
                  <p className="text-xs text-gray-500">
                    Created {new Date(workspace.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
