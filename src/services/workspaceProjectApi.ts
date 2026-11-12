import api from './authApi';

export type BoardStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type BoardPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export interface BoardProject { id: string; workspaceId: string; name: string; description: string; createdBy: string; createdAt: string; updatedAt: string; }
export interface BoardTask { id: string; workspaceId: string; projectId: string; title: string; description: string; assigneeId: string | null; assignee: { id: string; firstName: string; lastName: string; email: string } | null; createdBy: string; updatedBy: string; status: BoardStatus; priority: BoardPriority; dueDate: string | null; statusUpdatedAt: string; createdAt: string; updatedAt: string; }
export type BoardTaskInput = Partial<Pick<BoardTask, 'title' | 'description' | 'assigneeId' | 'status' | 'priority' | 'dueDate'>>;

export const workspaceProjectApi = {
  listProjects: async (workspaceId: string) => (await api.get<{ projects: BoardProject[] }>(`/v1/workspaces/${workspaceId}/projects`)).data,
  createProject: async (workspaceId: string, input: { name: string; description: string }) => (await api.post<{ project: BoardProject }>(`/v1/workspaces/${workspaceId}/projects`, input)).data,
  updateProject: async (workspaceId: string, projectId: string, input: { name?: string; description?: string }) => (await api.put<{ project: BoardProject }>(`/v1/workspaces/${workspaceId}/projects/${projectId}`, input)).data,
  deleteProject: async (workspaceId: string, projectId: string) => api.delete(`/v1/workspaces/${workspaceId}/projects/${projectId}`),
  listTasks: async (workspaceId: string, projectId: string) => (await api.get<{ tasks: BoardTask[] }>(`/v1/workspaces/${workspaceId}/projects/${projectId}/tasks`)).data,
  createTask: async (workspaceId: string, projectId: string, input: BoardTaskInput) => (await api.post<{ task: BoardTask }>(`/v1/workspaces/${workspaceId}/projects/${projectId}/tasks`, input)).data,
  updateTask: async (workspaceId: string, projectId: string, taskId: string, input: BoardTaskInput) => (await api.put<{ task: BoardTask }>(`/v1/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`, input)).data,
  deleteTask: async (workspaceId: string, projectId: string, taskId: string) => api.delete(`/v1/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`),
};
