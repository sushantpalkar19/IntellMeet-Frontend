import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { getDashboardStats, fetchWorkspaces } = vi.hoisted(() => ({ getDashboardStats: vi.fn(), fetchWorkspaces: vi.fn() }));
vi.mock('../services/analyticsApi', () => ({ analyticsApi: { getDashboardStats }, defaultAnalyticsFilters: vi.fn() }));
vi.mock('../stores/authStore', () => ({ useAuthStore: () => ({ user: { firstName: 'Taylor', lastName: 'User', email: 'taylor@example.com' } }) }));
vi.mock('../stores/workspaceStore', () => ({ useWorkspaceStore: () => ({ workspaces: [], isLoading: false, error: null, fetchWorkspaces }) }));
vi.mock('../components/layout/DashboardNavbar', () => ({ default: () => <nav>Navigation</nav> }));

import Dashboard from './Dashboard';

beforeEach(() => { vi.clearAllMocks(); fetchWorkspaces.mockResolvedValue(undefined); });
afterEach(() => cleanup());

describe('Dashboard KPI counts', () => {
  it('renders numeric meeting and summary counts, including zero', async () => {
    getDashboardStats.mockResolvedValue({ meetings: { active: 0 }, aiSummaries: 0 });
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    await screen.findAllByText('0');
    expect(within(screen.getByText('Meetings').closest('div.rounded-2xl')!).getByText('0')).toBeInTheDocument();
    expect(within(screen.getByText('AI Summaries').closest('div.rounded-2xl')!).getByText('0')).toBeInTheDocument();
    expect(getDashboardStats).toHaveBeenCalledOnce();
  });

  it('renders nonzero live plus upcoming meetings and generated summaries', async () => {
    getDashboardStats.mockResolvedValue({ meetings: { active: 4 }, aiSummaries: 2 });
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    await screen.findByText('4');
    expect(within(screen.getByText('Meetings').closest('div.rounded-2xl')!).getByText('4')).toBeInTheDocument();
    expect(within(screen.getByText('AI Summaries').closest('div.rounded-2xl')!).getByText('2')).toBeInTheDocument();
  });

  it('shows a retry state when the counts request fails', async () => {
    getDashboardStats.mockRejectedValueOnce(new Error('network error'));
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(await screen.findAllByText(/Counts unavailable/)).toHaveLength(2);
  });
});

