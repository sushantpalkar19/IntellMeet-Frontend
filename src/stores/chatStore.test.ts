import { afterEach, describe, expect, it, vi } from 'vitest';

const { socket, history } = vi.hoisted(() => ({
  socket: { connected: true, emit: vi.fn() },
  history: { resolve: null as null | ((value: unknown) => void) },
}));
vi.mock('../services/socket', () => ({ getSocket: () => socket }));
vi.mock('../services/meetingApi', () => ({
  meetingApi: { getMeetingMessages: () => new Promise((resolve) => { history.resolve = resolve; }) },
}));

import { useChatStore } from './chatStore';

const message = {
  id: 'message-1', meetingId: 'meeting-1', userId: 'user-a',
  user: { id: 'user-a', firstName: 'A', lastName: 'User', email: 'a@example.com' },
  content: 'Hello', messageType: 'text' as const, createdAt: '2026-11-11T07:00:00.000Z',
};

afterEach(() => {
  useChatStore.getState().clearMessages();
  socket.emit.mockClear();
});

describe('chat store delivery', () => {
  it('emits a valid chat:send payload and adds the sender broadcast exactly once', () => {
    useChatStore.getState().sendMessage('meeting-1', ' Hello ');
    expect(socket.emit).toHaveBeenCalledWith('chat:send', { meetingId: 'meeting-1', content: 'Hello' });

    const event = { meetingId: 'meeting-1', message };
    useChatStore.getState().addMessage(event, 'user-a');
    useChatStore.getState().addMessage(event, 'user-a');
    expect(useChatStore.getState().messages).toEqual([message]);
  });

  it('preserves live socket messages when initial history resolves afterward', async () => {
    const historyMessage = { ...message, id: 'history-1', userId: 'user-b', content: 'Earlier' };
    const store = useChatStore;
    const historyLoad = store.getState().loadMessages('meeting-1');
    store.getState().addMessage({ meetingId: 'meeting-1', message });
    await vi.waitFor(() => expect(history.resolve).toBeTypeOf('function'));
    history.resolve?.({ messages: [historyMessage], pagination: { page: 1, limit: 50, total: 1, totalPages: 1 } });
    await historyLoad;
    expect(store.getState().messages.map((item) => item.id)).toEqual(['history-1', 'message-1']);
  });
});
