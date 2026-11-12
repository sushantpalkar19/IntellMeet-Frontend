import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import NotificationsMenu from './NotificationsMenu';
import { schedulingApi } from '../../services/schedulingApi';

vi.mock('../../services/schedulingApi', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../services/schedulingApi')>()), schedulingApi: { notifications: vi.fn(), getReminderPreference: vi.fn(), markRead: vi.fn(), setReminderPreference: vi.fn() } }));
const note = { id: 'notification-1', type: 'meeting_reminder', title: 'Upcoming meeting', message: 'Planning starts in 5 minutes.', meetingId: 'meeting-1', createdAt: new Date().toISOString() };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(schedulingApi.notifications).mockResolvedValue({ notifications: [note], unread: 1 }); vi.mocked(schedulingApi.getReminderPreference).mockResolvedValue({ preference: { enabled: true, reminderMinutes: [15, 5] } }); vi.mocked(schedulingApi.markRead).mockResolvedValue({}); vi.mocked(schedulingApi.setReminderPreference).mockResolvedValue({ preference: { enabled: false, reminderMinutes: [15, 5] } }); });
afterEach(() => cleanup());

describe('NotificationsMenu', () => {
  it('shows persisted notifications and marks an item read', async () => {
    render(<MemoryRouter><NotificationsMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    fireEvent.click(await screen.findByText('Planning starts in 5 minutes.'));
    await waitFor(() => expect(schedulingApi.markRead).toHaveBeenCalledWith('notification-1'));
  });

  it('persists reminder opt-out preference', async () => {
    render(<MemoryRouter><NotificationsMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Meeting reminders' }));
    await waitFor(() => expect(schedulingApi.setReminderPreference).toHaveBeenCalledWith(false, [15, 5]));
  });
});
