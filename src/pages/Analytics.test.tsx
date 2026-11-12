import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { analytics, fetchWorkspaces, pdfSave } = vi.hoisted(() => ({
  fetchWorkspaces: vi.fn(),
  analytics: { getOverview: vi.fn(), getMeetings: vi.fn(), getTasks: vi.fn(), getAi: vi.fn(), getWorkspaces: vi.fn() },
  pdfSave: vi.fn(),
}));
vi.mock('../services/analyticsApi', () => ({ analyticsApi: analytics }));
vi.mock('../stores/workspaceStore', () => ({ useWorkspaceStore: () => ({ workspaces: [{ id: 'w-1', name: 'Design Team' }], fetchWorkspaces }) }));
vi.mock('../components/layout/DashboardNavbar', () => ({ default: () => <nav>Navigation</nav> }));
vi.mock('jspdf', () => ({ default: class { setFontSize = vi.fn(); text = vi.fn(); addPage = vi.fn(); save = pdfSave; } }));

import Analytics from './Analytics';

const overview = { range: { from: '', to: '' }, meetings: { total: 5, completed: 2, live: 1, upcoming: 1, cancelled: 1, totalDurationMs: 3600000, averageDurationMs: 1800000, durationSampleCount: 2 }, attendanceRecords: 7, ai: { summariesGenerated: 1 }, tasks: { total: 4, todo: 1, inProgress: 1, completed: 2 } };
const meetings = { groupBy: 'day', unit: 'day', activity: [{ _id: '2026-11-12', count: 5 }], status: { ended: 2, live: 1, scheduled: 1, cancelled: 1 }, durations: [{ _id: '2026-11-12', totalMs: 3600000, averageMs: 1800000, count: 2 }], byWorkspace: [{ workspaceId: 'w-1', name: 'Design Team', count: 5 }], attendance: [{ _id: '2026-11-12', attendanceRecords: 7, meetingCount: 2 }] };
const tasks = { total: 4, completed: 2, todo: 1, inProgress: 1, completionPercent: 50, priorities: { HIGH: 2, LOW: 2 }, byWorkspace: [{ workspaceId: 'w-1', name: 'Design Team', count: 4, completed: 2 }], byAssignee: [{ workspaceId: 'w-1', userId: 'u-1', name: 'Alex Member', assigned: 3, completed: 2 }] };
const ai = { transcriptMeetings: 2, transcriptSegments: 8, summariesGenerated: 1, meetingsWithSummaries: 1, actionItems: 3, recordings: 1, meetingsWithRecordings: 1 };
const workspaceData = { workspaces: [{ id: 'w-1', name: 'Design Team', meetings: 5, completed: 2, tasks: 4, completedTasks: 2 }], page: 1, limit: 20 };
function configure() { analytics.getOverview.mockResolvedValue(overview); analytics.getMeetings.mockResolvedValue(meetings); analytics.getTasks.mockResolvedValue(tasks); analytics.getAi.mockResolvedValue(ai); analytics.getWorkspaces.mockResolvedValue(workspaceData); }
beforeEach(() => { vi.clearAllMocks(); configure(); });
afterEach(() => cleanup());

describe('Analytics dashboard', () => {
  it('renders persisted KPIs and chart data', async () => {
    render(<Analytics/>);
    expect(await screen.findByText('Total meetings')).toBeInTheDocument();
    expect(screen.getByText('Attendance records')).toBeInTheDocument();
    expect(screen.getByText('Tasks by priority')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Meetings per period chart' })).toBeInTheDocument();
    expect(screen.getByText('Alex Member')).toBeInTheDocument();
  });

  it('passes date, workspace and grouping filters to authorized analytics APIs', async () => {
    render(<Analytics/>); await screen.findByText('Total meetings');
    fireEvent.change(screen.getByLabelText('Workspace filter'), { target: { value: 'w-1' } });
    await waitFor(() => expect(analytics.getOverview).toHaveBeenLastCalledWith(expect.objectContaining({ workspaceId: 'w-1' })));
    fireEvent.change(screen.getByLabelText('Group by'), { target: { value: 'week' } });
    await waitFor(() => expect(analytics.getMeetings).toHaveBeenLastCalledWith(expect.objectContaining({ workspaceId: 'w-1', groupBy: 'week' })));
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-10-01' } });
    await waitFor(() => expect(analytics.getTasks).toHaveBeenLastCalledWith(expect.objectContaining({ from: '2026-10-01' })));
  });

  it('shows loading, empty and error states', async () => {
    let resolveOverview!: (value: typeof overview) => void;
    analytics.getOverview.mockReturnValueOnce(new Promise((resolve) => { resolveOverview = resolve; }));
    const view = render(<Analytics/>); expect(screen.getByRole('status', { name: 'Loading analytics' })).toBeInTheDocument();
    resolveOverview(overview); await screen.findByText('Total meetings'); view.unmount(); cleanup();
    const emptyOverview = { ...overview, meetings: { ...overview.meetings, total: 0 }, tasks: { ...overview.tasks, total: 0 } };
    analytics.getOverview.mockResolvedValue(emptyOverview); analytics.getMeetings.mockResolvedValue({ ...meetings, activity: [], durations: [], byWorkspace: [], attendance: [], status: {} }); analytics.getTasks.mockResolvedValue({ ...tasks, total: 0, priorities: {}, byWorkspace: [], byAssignee: [] }); analytics.getAi.mockResolvedValue({ ...ai, transcriptSegments: 0 });
    render(<Analytics/>); expect(await screen.findByText(/No analytics records were found/)).toBeInTheDocument(); cleanup();
    analytics.getTasks.mockRejectedValue(new Error('forbidden'));
    render(<Analytics/>); expect(await screen.findByRole('alert')).toHaveTextContent(/could not be loaded/i);
  });

  it('exports the currently authorized report to PDF', async () => {
    render(<Analytics/>); await screen.findByText('Total meetings'); fireEvent.click(screen.getByRole('button', { name: 'Export PDF report' }));
    await waitFor(() => expect(pdfSave).toHaveBeenCalledWith('intellmeet-analytics.pdf'));
  });
});
