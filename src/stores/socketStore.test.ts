import { afterEach, describe, expect, it, vi } from 'vitest';

const { socket, manager, reconnectRoom } = vi.hoisted(() => {
  const manager = { on: vi.fn(), off: vi.fn() };
  const socket = { connected: false, on: vi.fn(), off: vi.fn(), auth: {}, io: manager, disconnect: vi.fn() };
  return { socket, manager, reconnectRoom: vi.fn() };
});
vi.mock('../services/socket', () => ({ connectSocket: vi.fn(() => socket), disconnectSocket: vi.fn() }));
vi.mock('./authStore', () => ({ useAuthStore: { getState: () => ({ accessToken: 'test-token' }) } }));
vi.mock('./meetingStore', () => ({ useMeetingStore: { getState: () => ({ currentMeeting: { id: 'meeting' }, restoreRoom: reconnectRoom }) } }));

import { useSocketStore } from './socketStore';

afterEach(() => {
  useSocketStore.getState().disconnect();
  socket.on.mockClear();
  socket.off.mockClear();
  manager.on.mockClear();
  manager.off.mockClear();
  reconnectRoom.mockClear();
  useSocketStore.setState({ isConnected: false, isConnecting: false, connectionError: null, reconnectAttempts: 0 });
});

describe('socket reconnect lifecycle', () => {
  it('binds lifecycle listeners once across repeated connect calls', () => {
    useSocketStore.getState().connect();
    useSocketStore.getState().connect();
    expect(socket.on.mock.calls.filter(([event]) => event === 'connect')).toHaveLength(1);
    expect(socket.on.mock.calls.filter(([event]) => event === 'disconnect')).toHaveLength(1);
    expect(manager.on.mock.calls.filter(([event]) => event === 'reconnect')).toHaveLength(1);
  });

  it('marks the socket reconnecting and restores the active meeting after reconnect', () => {
    useSocketStore.getState().connect();
    const disconnect = socket.on.mock.calls.find(([event]) => event === 'disconnect')?.[1] as (reason: string) => void;
    disconnect('transport close');
    const reconnectAttempt = manager.on.mock.calls.find(([event]) => event === 'reconnect_attempt')?.[1] as (attempt: number) => void;
    reconnectAttempt(2);
    expect(useSocketStore.getState()).toMatchObject({ isConnecting: true, isConnected: false, reconnectAttempts: 2 });
    const reconnect = manager.on.mock.calls.find(([event]) => event === 'reconnect')?.[1] as () => void;
    reconnect();
    expect(reconnectRoom).toHaveBeenCalledOnce();
    expect(useSocketStore.getState()).toMatchObject({ isConnected: true, isConnecting: false, reconnectAttempts: 0 });
  });
});
