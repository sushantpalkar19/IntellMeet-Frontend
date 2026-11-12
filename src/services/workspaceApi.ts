import api from './authApi';

export const WorkspaceRole = {
  OWNER: 'owner' as const,
  ADMIN: 'admin' as const,
  MEMBER: 'member' as const,
  VIEWER: 'viewer' as const,
} as const;

export type WorkspaceRole = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];

export interface Workspace {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  role: WorkspaceRole;
  joinedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface CreateWorkspaceInput {
  name: string;
  description: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
}

export interface AddMemberInput {
  email: string;
  password: string;
  role?: WorkspaceRole;
}

export interface UpdateMemberRoleInput {
  memberId: string;
  role: WorkspaceRole;
}

export const workspaceApi = {
  getWorkspaces: async (): Promise<{ workspaces: Workspace[] }> => {
    const response = await api.get('/v1/workspaces');
    return response.data;
  },

  createWorkspace: async (data: CreateWorkspaceInput): Promise<{ message: string; workspace: Workspace }> => {
    const response = await api.post('/v1/workspaces', data);
    return response.data;
  },

  getWorkspace: async (workspaceId: string): Promise<{ workspace: Workspace }> => {
    const response = await api.get(`/v1/workspaces/${workspaceId}`);
    return response.data;
  },

  updateWorkspace: async (workspaceId: string, data: UpdateWorkspaceInput): Promise<{ message: string; workspace: Workspace }> => {
    const response = await api.put(`/v1/workspaces/${workspaceId}`, data);
    return response.data;
  },

  deleteWorkspace: async (workspaceId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/v1/workspaces/${workspaceId}`);
    return response.data;
  },

  getWorkspaceMembers: async (workspaceId: string): Promise<{ members: WorkspaceMember[] }> => {
    const response = await api.get(`/v1/workspaces/${workspaceId}/members`);
    return response.data;
  },

  addMember: async (workspaceId: string, data: AddMemberInput): Promise<{ message: string; member: WorkspaceMember }> => {
    const response = await api.post(`/v1/workspaces/${workspaceId}/members`, data);
    return response.data;
  },

  updateMemberRole: async (workspaceId: string, memberId: string, role: WorkspaceRole): Promise<{ message: string; member: WorkspaceMember }> => {
    const response = await api.put(`/v1/workspaces/${workspaceId}/members/${memberId}`, { memberId, role });
    return response.data;
  },

  removeMember: async (workspaceId: string, memberId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/v1/workspaces/${workspaceId}/members/${memberId}`);
    return response.data;
  },
};
