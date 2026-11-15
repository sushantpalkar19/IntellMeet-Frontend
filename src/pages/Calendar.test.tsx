import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Calendar from './Calendar';
import { schedulingApi } from '../services/schedulingApi';
import { workspaceApi } from '../services/workspaceApi';
import { meetingApi } from '../services/meetingApi';

vi.mock('../components/layout/DashboardNavbar', () => ({ default: () => <nav>IntellMeet</nav> }));
vi.mock('../services/schedulingApi', async (importOriginal) => ({ ...(await importOriginal<typeof import('../services/schedulingApi')>()), schedulingApi: { calendar: vi.fn(), upcoming: vi.fn(), details: vi.fn(), schedule: vi.fn(), update: vi.fn(), addInvitees: vi.fn(), removeInvitee: vi.fn(), cancel: vi.fn() } }));
vi.mock('../services/workspaceApi', () => ({ workspaceApi: { getWorkspaces: vi.fn(), getWorkspaceMembers: vi.fn() } }));
vi.mock('../services/meetingApi', () => ({ meetingApi: { joinMeeting: vi.fn(), getMeetingInvitation: vi.fn() } }));

const workspace = { id: 'workspace-1', name: 'Product', role: 'owner' as const, ownerId: 'host-1', description: '', createdAt: '' };
const meeting = { id: 'meeting-1', workspaceId: 'workspace-1', title: 'Roadmap review', description: 'Quarterly plan', createdBy: 'host-1', status: 'scheduled' as const, scheduledAt: new Date(Date.now() + 86400000).toISOString(), endsAt: new Date(Date.now() + 90000000).toISOString(), timeZone: 'Asia/Kolkata', meetingType: 'team' as const, agenda: '', reminderMinutes: [15, 5], createdAt: new Date().toISOString() };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(workspaceApi.getWorkspaces).mockResolvedValue({ workspaces: [workspace] });
  vi.mocked(workspaceApi.getWorkspaceMembers).mockResolvedValue({ members: [] });
  vi.mocked(schedulingApi.calendar).mockResolvedValue({ meetings: [meeting] });
  vi.mocked(schedulingApi.upcoming).mockResolvedValue({ meetings: [meeting] });
  vi.mocked(schedulingApi.details).mockResolvedValue({ meeting, invitees: [] });
  vi.mocked(meetingApi.joinMeeting).mockResolvedValue({} as never);
});
afterEach(() => cleanup());

describe('Calendar page', () => {
  it('renders month, week and day navigation with localized meeting details', async () => {
    render(<MemoryRouter><Calendar /></MemoryRouter>);
    expect((await screen.findAllByText('Roadmap review')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'week' }));
    expect((await screen.findAllByText('Roadmap review')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'day' }));
    fireEvent.click(screen.getAllByText('Roadmap review')[0]);
    expect(await screen.findByRole('dialog', { name: 'Meeting details' })).toBeInTheDocument();
    expect(screen.getByText(/Asia\/Kolkata/)).toBeInTheDocument();
  });

  it('shows an empty state and a clear calendar load error', async () => {
    vi.mocked(schedulingApi.calendar).mockRejectedValueOnce(new Error('offline'));
    render(<MemoryRouter><Calendar /></MemoryRouter>);
    expect(await screen.findByText('Calendar events could not be loaded.')).toBeInTheDocument();
    await waitFor(() => expect(schedulingApi.upcoming).toHaveBeenCalled());
  });

  it('submits the selected workspace and schedule fields, then confirms success', async () => {
    vi.mocked(schedulingApi.schedule).mockResolvedValue({ meeting } as never);
    render(<MemoryRouter><Calendar /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Schedule meeting' }));
    const dialog = await screen.findByRole('dialog', { name: 'Schedule a meeting' });
    fireEvent.change(within(dialog).getByLabelText(/Workspace/), { target: { value: workspace.id } });
    fireEvent.change(within(dialog).getByPlaceholderText('e.g., Weekly Sprint Planning'), { target: { value: 'Planning session' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Schedule Meeting' }));
    await waitFor(() => expect(schedulingApi.schedule).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: workspace.id, title: 'Planning session', localStart: expect.any(String), localEnd: expect.any(String), timeZone: expect.any(String) })));
    expect(await screen.findByRole('status')).toHaveTextContent('Meeting scheduled.');
  });

  it('shows the validation message returned by the scheduling API', async () => {
    vi.mocked(schedulingApi.schedule).mockRejectedValueOnce({ response: { data: { message: 'Meeting start must be in the future.' } } });
    render(<MemoryRouter><Calendar /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Schedule meeting' }));
    const dialog = await screen.findByRole('dialog', { name: 'Schedule a meeting' });
    fireEvent.change(within(dialog).getByLabelText(/Workspace/), { target: { value: workspace.id } });
    fireEvent.change(within(dialog).getByPlaceholderText('e.g., Weekly Sprint Planning'), { target: { value: 'Planning session' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Schedule Meeting' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Meeting start must be in the future.');
  });
});
