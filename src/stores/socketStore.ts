import { create } from 'zustand';
import { connectSocket, disconnectSocket } from '../services/socket';
import type { Socket } from 'socket.io-client';
import { useAuthStore } from './authStore';
import { useMeetingStore } from './meetingStore';

let boundSocket: Socket | null = null;
let meetingNeedsRestore = false;
function restoreAfterReconnect(): void {
  if (!meetingNeedsRestore) return;
  meetingNeedsRestore = false;
  useMeetingStore.getState().restoreRoom();
}
const onConnect = () => {
  useSocketStore.setState({ isConnected: true, isConnecting: false, connectionError: null, reconnectAttempts: 0 });
  restoreAfterReconnect();
};
const onDisconnect = (reason: string) => {
  if (useMeetingStore.getState().currentMeeting) meetingNeedsRestore = true;
  useSocketStore.setState({
    isConnected: false,
    isConnecting: reason !== 'io server disconnect',
    connectionError: reason === 'io server disconnect' ? 'Server disconnected the connection' : null,
  });
};
const onConnectError = (error: Error) => useSocketStore.setState({ isConnected: false, isConnecting: true, connectionError: error.message || 'Connection failed' });
const onReconnectAttempt = (attemptNumber: number) => useSocketStore.setState({ reconnectAttempts: attemptNumber, isConnecting: true, isConnected: false });
const onReconnect = () => {
  useSocketStore.setState({ reconnectAttempts: 0, isConnecting: false, isConnected: true, connectionError: null });
  restoreAfterReconnect();
};
const onReconnectFailed = () => useSocketStore.setState({ isConnecting: false, isConnected: false, connectionError: 'Failed to reconnect after multiple attempts' });

function bindSocketLifecycle(socket: Socket): void {
  if (boundSocket === socket) return;
  if (boundSocket) {
    boundSocket.off('connect', onConnect);
    boundSocket.off('disconnect', onDisconnect);
    boundSocket.off('connect_error', onConnectError);
    boundSocket.io.off('reconnect_attempt', onReconnectAttempt);
    boundSocket.io.off('reconnect', onReconnect);
    boundSocket.io.off('reconnect_failed', onReconnectFailed);
  }
  boundSocket = socket;
  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);
  socket.on('connect_error', onConnectError);
  socket.io.on('reconnect_attempt', onReconnectAttempt);
  socket.io.on('reconnect', onReconnect);
  socket.io.on('reconnect_failed', onReconnectFailed);
}

interface SocketState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;

  // Actions
  connect: () => void;
  disconnect: () => void;
  setError: (error: string | null) => void;
  setConnecting: (isConnecting: boolean) => void;
  updateConnectionState: (connected: boolean) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,

  connect: () => {
    const { accessToken } = useAuthStore.getState();

    if (!accessToken) {
      set({
        connectionError: 'No access token available. Please log in.',
        isConnecting: false,
      });
      return;
    }

    set({ isConnecting: true, connectionError: null });

    try {
      const socket = connectSocket(accessToken);

      bindSocketLifecycle(socket);
      if (socket.connected) onConnect();

    } catch (error) {
      set({
        isConnected: false,
        isConnecting: false,
        connectionError: error instanceof Error ? error.message : 'Failed to initialize socket',
      });
    }
  },

  disconnect: () => {
    meetingNeedsRestore = false;
    if (boundSocket) {
      boundSocket.off('connect', onConnect);
      boundSocket.off('disconnect', onDisconnect);
      boundSocket.off('connect_error', onConnectError);
      boundSocket.io.off('reconnect_attempt', onReconnectAttempt);
      boundSocket.io.off('reconnect', onReconnect);
      boundSocket.io.off('reconnect_failed', onReconnectFailed);
      boundSocket = null;
    }
    disconnectSocket();
    set({
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      reconnectAttempts: 0,
    });
  },

  setError: (error: string | null) => {
    set({ connectionError: error });
  },

  setConnecting: (isConnecting: boolean) => {
    set({ isConnecting });
  },

  updateConnectionState: (connected: boolean) => {
    set({ 
      isConnected: connected,
      isConnecting: false,
      connectionError: connected ? null : get().connectionError,
    });
  },
}));
