import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { api, handlers, socket } = vi.hoisted(() => {
  const handlers = new Map<string, (...args: any[]) => void>();
  const socket = { on: vi.fn((event: string, handler: (...args: any[]) => void) => handlers.set(event, handler)), off: vi.fn((event: string) => handlers.delete(event)) };
  const api = { listProjects: vi.fn(), listTasks: vi.fn(), createTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn(), createProject: vi.fn(), updateProject: vi.fn(), deleteProject: vi.fn() };
  return { api, handlers, socket };
});
vi.mock('../../services/workspaceProjectApi', () => ({ workspaceProjectApi: api }));
vi.mock('../../services/socket', () => ({ getSocket: () => socket }));

import WorkspaceProjectBoard from './WorkspaceProjectBoard';

const project = { id: 'p-1', workspaceId: 'w-1', name: 'Launch', description: '', createdBy: 'u-1', createdAt: '', updatedAt: '' };
const task = { id: 't-1', workspaceId: 'w-1', projectId: 'p-1', title: 'Prepare launch', description: 'Draft checklist', assigneeId: null, assignee: null, createdBy: 'u-1', updatedBy: 'u-1', status: 'TODO' as const, priority: 'HIGH' as const, dueDate: null, statusUpdatedAt: '', createdAt: '', updatedAt: '' };
beforeEach(() => { vi.clearAllMocks(); handlers.clear(); api.listProjects.mockResolvedValue({ projects: [project] }); api.listTasks.mockResolvedValue({ tasks: [task] }); });
afterEach(() => { cleanup(); handlers.clear(); });

describe('workspace Kanban board', () => {
  it('renders tasks in status columns and persists drag-and-drop transitions', async () => {
    api.updateTask.mockResolvedValue({ task: { ...task, status: 'IN_PROGRESS' } });
    render(<WorkspaceProjectBoard workspaceId="w-1" members={[]} role="member" />);
    const card = await screen.findByText('Prepare launch');
    expect(card.closest('article')).toBeTruthy();
    const data = new Map<string, string>();
    fireEvent.dragStart(card.closest('article')!, { dataTransfer: { setData: (key: string, value: string) => data.set(key, value) } });
    const inProgressHeading = screen.getAllByText('In Progress').find((element) => element.tagName === 'H3')!;
    const inProgressColumn = inProgressHeading.closest('div[class*="min-h-64"]')!;
    fireEvent.drop(inProgressColumn, { dataTransfer: { getData: (key: string) => data.get(key) || '' } });
    await waitFor(() => expect(api.updateTask).toHaveBeenCalledWith('w-1', 'p-1', 't-1', { status: 'IN_PROGRESS' }));
  });

  it('refreshes board data on workspace task events and removes listeners on unmount', async () => {
    const { unmount } = render(<WorkspaceProjectBoard workspaceId="w-1" members={[]} role="viewer" />);
    await screen.findByText('Prepare launch');
    const before = api.listTasks.mock.calls.length;
    handlers.get('workspace:task:updated')?.({ workspaceId: 'w-1' });
    await waitFor(() => expect(api.listTasks.mock.calls.length).toBeGreaterThan(before));
    unmount();
    expect(socket.off).toHaveBeenCalledWith('workspace:task:updated', expect.any(Function));
  });

  it('shows the empty board state instead of dummy tasks', async () => {
    api.listProjects.mockResolvedValue({ projects: [] });
    api.listTasks.mockResolvedValue({ tasks: [] });
    render(<WorkspaceProjectBoard workspaceId="w-1" members={[]} role="viewer" />);
    expect(await screen.findByText(/No projects yet/)).toBeInTheDocument();
    expect(screen.queryByText('Prepare launch')).not.toBeInTheDocument();
  });
});
