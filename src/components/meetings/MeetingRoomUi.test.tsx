import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ChatPanel, { formatMessageTime, getMessageDateLabel } from './ChatPanel';
import MeetingInvitationPanel from './MeetingInvitationPanel';

const { mockSocket, meetingApiMock } = vi.hoisted(() => ({
  mockSocket: { on: vi.fn(), off: vi.fn(), emit: vi.fn(), connected: true },
  meetingApiMock: {
    getMeetingInvitation: vi.fn().mockResolvedValue({ meetingId: 'IM-AB12CD34', joinCode: 'A1B2C3D4', invitationId: 'X'.repeat(32) }),
    getMeetingMessages: vi.fn().mockResolvedValue({ messages: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 1 } }),
  },
}));
vi.mock('../../services/meetingApi', () => ({ meetingApi: meetingApiMock }));
vi.mock('../../services/socket', () => ({ getSocket: () => mockSocket }));

const { useAuthStore } = await import('../../stores/authStore');
const { useChatStore } = await import('../../stores/chatStore');
const { useSocketStore } = await import('../../stores/socketStore');

afterEach(() => { vi.restoreAllMocks(); useChatStore.getState().clearMessages(); useSocketStore.setState({ isConnected: false }); meetingApiMock.getMeetingMessages.mockClear(); });

describe('meeting room UI helpers', () => {
  it('formats timestamps locally and groups dates as Today, Yesterday, or a date', () => {
    const now = new Date(2026, 2, 15, 12);
    expect(getMessageDateLabel(new Date(2026, 2, 15, 9).toISOString(), now)).toBe('Today');
    expect(getMessageDateLabel(new Date(2026, 2, 14, 9).toISOString(), now)).toBe('Yesterday');
    expect(getMessageDateLabel(new Date(2026, 2, 10, 9).toISOString(), now)).toMatch(/March 10|10 March/);
    expect(formatMessageTime(new Date(2026, 2, 15, 12, 45).toISOString())).toMatch(/12:45/);
  });

  it('renders local and remote messages on opposite sides and sends with Enter', async () => {
    useAuthStore.setState({ user: { id: 'me', firstName: 'Local', lastName: 'Person', email: 'local@test' } as never });
    useChatStore.setState({ messages: [
      { id: 'own-1', meetingId: 'm', userId: 'me', user: { id: 'me', firstName: 'Local', lastName: 'Person', email: '' }, content: 'My message', messageType: 'text', createdAt: new Date().toISOString() },
      { id: 'remote-1', meetingId: 'm', userId: 'other', user: { id: 'other', firstName: 'Other', lastName: 'Person', email: '' }, content: 'Their message', messageType: 'text', createdAt: new Date().toISOString() },
    ] });
    const view = render(<ChatPanel meetingId="m" />);
    expect(screen.getByText('My message').parentElement?.parentElement).toHaveClass('justify-end');
    expect(screen.getByText('Their message').parentElement?.parentElement).toHaveClass('justify-start');
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'Sent' } });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Message' }), { key: 'Enter' });
    await waitFor(() => expect(mockSocket.emit).toHaveBeenCalledWith('chat:send', { meetingId: 'm', content: 'Sent' }));
    view.unmount();
  });

  it('reloads message history when the socket reconnects', async () => {
    useSocketStore.setState({ isConnected: false });
    const view = render(<ChatPanel meetingId="reconnect-meeting" />);
    expect(meetingApiMock.getMeetingMessages).not.toHaveBeenCalled();
    useSocketStore.setState({ isConnected: true });
    await waitFor(() => expect(meetingApiMock.getMeetingMessages).toHaveBeenCalledWith('reconnect-meeting', 1, 50));
    view.unmount();
  });

  it('loads host invitation fields and copies the invitation link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const close = vi.fn();
    render(<MeetingInvitationPanel meetingId="m" meetingTitle="Design sync" onClose={close} />);
    await screen.findByText('IM-AB12CD34');
    fireEvent.click(screen.getAllByRole('button', { name: 'Copy' })[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/join/')));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(close).toHaveBeenCalled();
  });
});
