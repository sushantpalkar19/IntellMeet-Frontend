import { io, Socket } from 'socket.io-client';

// Use WebSocket URL from environment, fallback to derived API URL
const WS_URL = import.meta.env.VITE_WS_URL || 
  (import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000');

// Socket.IO client singleton
let socketInstance: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_BASE = 1000; // 1 second

/**
 * Get or create the Socket.IO client instance
 * Implements singleton pattern to prevent duplicate connections
 */
export function getSocket(): Socket | null {
  return socketInstance;
}

/**
 * Connect to Socket.IO server with JWT authentication
 * @param token - JWT access token for authentication
 * @returns Socket instance
 */
export function connectSocket(token: string): Socket {
  // Keep a disconnected instance alive so Socket.IO can complete its own retry cycle.
  if (socketInstance) {
    const currentToken = (socketInstance.auth as { token?: string } | undefined)?.token;
    if (currentToken !== token) {
      socketInstance.auth = { token };
      if (socketInstance.connected) socketInstance.disconnect().connect();
      else socketInstance.connect();
    } else if (!socketInstance.connected && !socketInstance.active) socketInstance.connect();
    return socketInstance;
  }

  // Create new socket instance
  socketInstance = io(WS_URL, {
    auth: {
      token,
    },
    reconnection: true,
    reconnectionDelay: RECONNECT_DELAY_BASE,
    reconnectionDelayMax: RECONNECT_DELAY_BASE * Math.pow(2, MAX_RECONNECT_ATTEMPTS),
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    transports: ['websocket', 'polling'],
  });

  // Reset reconnect attempts on successful connection
  socketInstance.on('connect', () => {
    reconnectAttempts = 0;
  });

  // Track reconnect attempts
  socketInstance.io.on('reconnect_attempt', (attemptNumber) => {
    reconnectAttempts = attemptNumber;
  });

  // Handle max reconnection attempts reached
  socketInstance.io.on('reconnect_failed', () => {
    // Will be handled by socketStore via disconnect event
  });

  return socketInstance;
}

/**
 * Disconnect from Socket.IO server
 */
export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    reconnectAttempts = 0;
  }
}

/**
 * Update authentication token for existing socket connection
 * This is useful when token is refreshed
 * @param token - New JWT access token
 */
export function updateSocketToken(token: string): void {
  if (socketInstance?.connected) {
    socketInstance.auth = { token };
    // Re-authenticate with new token
    socketInstance.disconnect().connect();
  }
}

/**
 * Get current reconnect attempts count
 */
export function getReconnectAttempts(): number {
  return reconnectAttempts;
}

/**
 * Reset reconnect attempts counter
 */
export function resetReconnectAttempts(): void {
  reconnectAttempts = 0;
}
