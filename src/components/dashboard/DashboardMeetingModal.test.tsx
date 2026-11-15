import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import DashboardMeetingModal from './DashboardMeetingModal';

function CurrentLocation() { const location = useLocation(); return <output>{location.pathname}{location.search}</output>; }

afterEach(() => cleanup());

describe('Dashboard meeting actions', () => {
  it('takes Schedule Meeting through workspace selection to the calendar form', () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><DashboardMeetingModal isOpen onClose={() => undefined} actionType="schedule" workspaces={[{ id: 'workspace-7', name: 'Product', role: 'owner', ownerId: 'user-1', description: '', createdAt: '' }]} /><CurrentLocation /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Product/ }));
    expect(screen.getByText('/calendar?workspaceId=workspace-7&create=1')).toBeInTheDocument();
  });
});
