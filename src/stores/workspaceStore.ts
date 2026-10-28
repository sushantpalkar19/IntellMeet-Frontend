import { create } from 'zustand';
import { workspaceApi, WorkspaceRole } from '../services/workspaceApi';
import type { Workspace, WorkspaceMember } from '../services/workspaceApi';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  members: WorkspaceMember[];
  isLoading: boolean;
  error: string | null;

  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (name: string, description: string) => Promise<Workspace>;
  fetchWorkspace: (workspaceId: string) => Promise<void>;
  updateWorkspace: (workspaceId: string, name: string, description: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  fetchMembers: (workspaceId: string) => Promise<void>;
  addMember: (workspaceId: string, email: string, role?: WorkspaceRole) => Promise<void>;
  updateMemberRole: (workspaceId: string, memberId: string, role: WorkspaceRole) => Promise<void>;
  removeMember: (workspaceId: string, memberId: string) => Promise<void>;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  clearError: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  currentWorkspace: null,
  members: [],
  isLoading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await workspaceApi.getWorkspaces();
      set({ workspaces: response.workspaces, isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch workspaces';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  createWorkspace: async (name: string, description: string): Promise<Workspace> => {
    set({ isLoading: true, error: null });
    try {
      const response = await workspaceApi.createWorkspace({ name, description });
      set((state) => ({
        workspaces: [...state.workspaces, response.workspace],
        isLoading: false,
      }));
      return response.workspace;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create workspace';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  fetchWorkspace: async (workspaceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await workspaceApi.getWorkspace(workspaceId);
      set({ currentWorkspace: response.workspace, isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch workspace';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  updateWorkspace: async (workspaceId: string, name: string, description: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await workspaceApi.updateWorkspace(workspaceId, { name, description });
      set((state) => ({
        workspaces: state.workspaces.map((w) =>
          w.id === workspaceId ? response.workspace : w
        ),
        currentWorkspace: state.currentWorkspace?.id === workspaceId ? response.workspace : state.currentWorkspace,
        isLoading: false,
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update workspace';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  deleteWorkspace: async (workspaceId: string) => {
    set({ isLoading: true, error: null });
    try {
      await workspaceApi.deleteWorkspace(workspaceId);
      set((state) => ({
        workspaces: state.workspaces.filter((w) => w.id !== workspaceId),
        currentWorkspace: state.currentWorkspace?.id === workspaceId ? null : state.currentWorkspace,
        isLoading: false,
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete workspace';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  fetchMembers: async (workspaceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await workspaceApi.getWorkspaceMembers(workspaceId);
      set({ members: response.members, isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch members';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  addMember: async (workspaceId: string, email: string, role?: WorkspaceRole) => {
    set({ isLoading: true, error: null });
    try {
      const response = await workspaceApi.addMember(workspaceId, { email, role });
      set((state) => ({
        members: [...state.members, response.member],
        isLoading: false,
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to add member';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  updateMemberRole: async (workspaceId: string, memberId: string, role: WorkspaceRole) => {
    set({ isLoading: true, error: null });
    try {
      const response = await workspaceApi.updateMemberRole(workspaceId, memberId, role);
      set((state) => ({
        members: state.members.map((m) =>
          m.id === memberId ? response.member : m
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update member role';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  removeMember: async (workspaceId: string, memberId: string) => {
    set({ isLoading: true, error: null });
    try {
      await workspaceApi.removeMember(workspaceId, memberId);
      set((state) => ({
        members: state.members.filter((m) => m.id !== memberId),
        isLoading: false,
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to remove member';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  setCurrentWorkspace: (workspace: Workspace | null) => {
    set({ currentWorkspace: workspace });
  },

  clearError: () => {
    set({ error: null });
  },
}));
