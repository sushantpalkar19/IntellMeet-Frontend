import { create } from 'zustand';
import { getSocket } from '../services/socket';
import type { ChatMessage, ChatNewPayload } from '../types/meeting';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;

  // Actions
  loadMessages: (meetingId: string, page?: number) => Promise<void>;
  sendMessage: (meetingId: string, content: string) => void;
  addMessage: (payload: ChatNewPayload, currentUserId?: string) => void;
  clearMessages: () => void;
  setError: (error: string | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  currentPage: 1,
  totalPages: 1,

  loadMessages: async (meetingId, page = 1) => {
    set({ isLoading: true, error: null });

    try {
      const { meetingApi } = await import('../services/meetingApi');
      const response = await meetingApi.getMeetingMessages(meetingId, page, 50);

      const newMessages = response.messages.reverse(); // API returns newest first, reverse for chronological order

      if (page === 1) {
        const liveMessages = get().messages;
        const historyIds = new Set(newMessages.map((message) => message.id));
        const mergedMessages = [...newMessages, ...liveMessages.filter((message) => !historyIds.has(message.id))]
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        set({
          messages: mergedMessages,
          currentPage: response.pagination.page,
          totalPages: response.pagination.totalPages,
          isLoading: false,
        });
      } else {
        set({
          messages: [...newMessages, ...get().messages],
          currentPage: response.pagination.page,
          totalPages: response.pagination.totalPages,
          isLoading: false,
        });
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      set({
        error: error.response?.data?.message || 'Failed to load messages',
        isLoading: false,
      });
    }
  },

  sendMessage: (meetingId, content) => {
    const socket = getSocket();
    if (!socket?.connected) {
      set({ error: 'Not connected to server' });
      return;
    }

    if (!content.trim()) {
      set({ error: 'Message cannot be empty' });
      return;
    }

    if (content.length > 2000) {
      set({ error: 'Message too long (max 2000 characters)' });
      return;
    }

    socket.emit('chat:send', { meetingId, content: content.trim() });
    set({ error: null });
  },

  addMessage: (payload: ChatNewPayload, _currentUserId?: string) => {
    const { messages } = get();
    if (messages.some((message) => message.id === payload.message.id)) return;

    set({
      messages: [...messages, payload.message],
    });
  },

  clearMessages: () => {
    set({
      messages: [],
      currentPage: 1,
      totalPages: 1,
      error: null,
    });
  },

  setError: (error) => {
    set({ error });
  },
}));
