import { create } from 'zustand';
import { getSocket } from '../services/socket';
import {
  setupWebRTCListeners,
  cleanupWebRTCListeners,
  closeAllPeerConnections,
  closePeerConnection,
  createOffer,
  setLocalMediaStream,
  setWebRTCCallbacks,
  setWebRTCLocalUserId,
} from '../services/webrtc';
import { useAuthStore } from './authStore';
import type {
  Meeting,
  ParticipantJoinedPayload,
  ParticipantLeftPayload,
  MeetingJoinedResponse,
  MeetingStartedResponse,
  ParticipantMediaStatePayload,
} from '../types/meeting';

let activeSocketCleanup: (() => void) | null = null;

export interface Participant {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  joinedAt: string;
}

interface MeetingState {
  // Current meeting
  currentMeeting: Meeting | null;
  isInRoom: boolean;
  isJoining: boolean;
  joinError: string | null;

  // Participants
  participants: Map<string, Participant>;

  // Remote media streams
  remoteStreams: Map<string, MediaStream>;

  // Participant media states
  participantAudioEnabled: Map<string, boolean>;
  participantVideoEnabled: Map<string, boolean>;
  screenShare: { userId: string; userName: string } | null;

  // Actions
  setCurrentMeeting: (meeting: Meeting | null) => void;
  joinRoom: (meetingId: string) => Promise<void>;
  restoreRoom: () => void;
  leaveRoom: (notifyServer?: boolean) => void;
  setJoining: (isJoining: boolean) => void;
  setJoinError: (error: string | null) => void;
  addParticipant: (payload: ParticipantJoinedPayload) => void;
  removeParticipant: (payload: ParticipantLeftPayload) => void;
  clearParticipants: () => void;
  updateMeetingStatus: (status: 'live', startedAt: string) => void;
  addRemoteStream: (peerUserId: string, stream: MediaStream) => void;
  removeRemoteStream: (peerUserId: string) => void;
  clearRemoteStreams: () => void;
  setParticipantAudioEnabled: (peerUserId: string, enabled: boolean) => void;
  setParticipantVideoEnabled: (peerUserId: string, enabled: boolean) => void;
  setScreenShare: (screenShare: { userId: string; userName: string } | null) => void;
}

export const useMeetingStore = create<MeetingState>((set, get) => ({
  currentMeeting: null,
  isInRoom: false,
  isJoining: false,
  joinError: null,
  participants: new Map(),
  remoteStreams: new Map(),
  participantAudioEnabled: new Map(),
  participantVideoEnabled: new Map(),
  screenShare: null,

  setCurrentMeeting: (meeting) => {
    set({ currentMeeting: meeting });
  },

  joinRoom: async (meetingId): Promise<void> => {
    const state = get();
    if (state.isJoining || (state.isInRoom && state.currentMeeting?.id === meetingId)) return;
    const socket = getSocket();
    if (!socket?.connected) {
      set({
        joinError: 'Not connected to server. Please check your connection.',
        isJoining: false,
      });
      return;
    }

    set({ isJoining: true, joinError: null });
    const ownUserId = useAuthStore.getState().user?.id;
    if (ownUserId) setWebRTCLocalUserId(ownUserId);
    activeSocketCleanup?.();

    // Setup WebRTC track callback
    setWebRTCCallbacks(
      (peerUserId, track) => {
        const { remoteStreams } = get();
        let stream = remoteStreams.get(peerUserId);
        
        if (!stream) {
          stream = new MediaStream();
          set({ remoteStreams: new Map(remoteStreams).set(peerUserId, stream) });
        }
        
        stream.addTrack(track);
      },
      (peerUserId, state) => {
        console.log(`Peer ${peerUserId} connection state: ${state}`);
        if (state === 'failed' || state === 'closed') {
          const { remoteStreams } = get();
          remoteStreams.delete(peerUserId);
          set({ remoteStreams: new Map(remoteStreams) });
        }
      },
      (peerUserId, state) => {
        console.log(`Peer ${peerUserId} ICE state: ${state}`);
      }
    );

    // Set up event listeners
    const handleJoined = (response: MeetingJoinedResponse) => {
      if (response.meetingId === meetingId) {
        set({
          isInRoom: true,
          isJoining: false,
          joinError: null,
          currentMeeting: get().currentMeeting
            ? { ...get().currentMeeting!, status: response.meeting.status as 'live' | 'scheduled' | 'ended' | 'cancelled', startedAt: response.meeting.startedAt }
            : null,
        });
      }
    };

    const handleError = (error: { message: string }) => {
      set({
        isJoining: false,
        joinError: error.message || 'Failed to join meeting',
        isInRoom: false,
      });
    };

    const handleParticipantJoined = (payload: ParticipantJoinedPayload) => {
      if (payload.meetingId === meetingId) {
        const { participants } = get();
        const newParticipants = new Map(participants).set(payload.userId, {
          userId: payload.userId,
          firstName: payload.user.firstName,
          lastName: payload.user.lastName,
          email: payload.user.email,
          joinedAt: payload.joinedAt,
        });
        set({ participants: newParticipants });

        // Create WebRTC peer connection for new participant (not self)
        if (payload.userId !== ownUserId) {
          createOffer(payload.userId, meetingId);
        }
      }
    };

    const handleParticipantLeft = (payload: ParticipantLeftPayload) => {
      if (payload.meetingId === meetingId) {
        const { participants, remoteStreams } = get();
        const newParticipants = new Map(participants);
        newParticipants.delete(payload.userId);
        const newRemoteStreams = new Map(remoteStreams);
        newRemoteStreams.delete(payload.userId);
        const newParticipantAudioEnabled = new Map(get().participantAudioEnabled);
        const newParticipantVideoEnabled = new Map(get().participantVideoEnabled);
        newParticipantAudioEnabled.delete(payload.userId);
        newParticipantVideoEnabled.delete(payload.userId);
        set({ 
          participants: newParticipants,
          remoteStreams: newRemoteStreams,
          participantAudioEnabled: newParticipantAudioEnabled,
          participantVideoEnabled: newParticipantVideoEnabled,
          screenShare: get().screenShare?.userId === payload.userId ? null : get().screenShare,
        });

        // Close WebRTC peer connection for leaving participant
        closePeerConnection(payload.userId);
      }
    };

    const handleMeetingStarted = (payload: MeetingStartedResponse) => {
      if (payload.meetingId === meetingId) {
        set({
          currentMeeting: get().currentMeeting
            ? { ...get().currentMeeting!, status: payload.status as 'live' | 'scheduled' | 'ended' | 'cancelled', startedAt: payload.startedAt }
            : null,
        });
      }
    };

    const handleParticipantMediaState = (payload: ParticipantMediaStatePayload) => {
      if (payload.meetingId === meetingId) {
        set({
          participantAudioEnabled: new Map(get().participantAudioEnabled).set(payload.userId, payload.audioEnabled),
          participantVideoEnabled: new Map(get().participantVideoEnabled).set(payload.userId, payload.videoEnabled),
        });
      }
    };

    const handleScreenShareStarted = (payload: { meetingId: string; userId: string; user?: { firstName?: string; lastName?: string } }) => {
      if (payload.meetingId === meetingId) {
        const userName = [payload.user?.firstName, payload.user?.lastName].filter(Boolean).join(' ') || 'A participant';
        set({ screenShare: { userId: payload.userId, userName } });
      }
    };
    const handleScreenShareStopped = (payload: { meetingId: string; userId: string }) => {
      if (payload.meetingId === meetingId && get().screenShare?.userId === payload.userId) set({ screenShare: null });
    };

    // Register event listeners
    socket.on('meeting:joined', handleJoined);
    socket.on('error', handleError);
    socket.on('participant:joined', handleParticipantJoined);
    socket.on('participant:left', handleParticipantLeft);
    socket.on('meeting:started', handleMeetingStarted);
    socket.on('participant:media:state', handleParticipantMediaState);
    socket.on('screenshare:started', handleScreenShareStarted);
    socket.on('screenshare:stopped', handleScreenShareStopped);
    activeSocketCleanup = () => {
      socket.off('meeting:joined', handleJoined);
      socket.off('error', handleError);
      socket.off('participant:joined', handleParticipantJoined);
      socket.off('participant:left', handleParticipantLeft);
      socket.off('meeting:started', handleMeetingStarted);
      socket.off('participant:media:state', handleParticipantMediaState);
      socket.off('screenshare:started', handleScreenShareStarted);
      socket.off('screenshare:stopped', handleScreenShareStopped);
    };

    // Setup WebRTC listeners
    setupWebRTCListeners(meetingId);

    // Emit join event
    socket.emit('meeting:join', { meetingId });
  },

  restoreRoom: () => {
    const meeting = get().currentMeeting;
    const socket = getSocket();
    if (!meeting || !socket?.connected) return;
    closeAllPeerConnections();
    set({
      isInRoom: false,
      isJoining: false,
      joinError: null,
      participants: new Map(),
      remoteStreams: new Map(),
      participantAudioEnabled: new Map(),
      participantVideoEnabled: new Map(),
      screenShare: null,
    });
    void get().joinRoom(meeting.id);
  },

  leaveRoom: (notifyServer = true) => {
    const { currentMeeting, isInRoom } = get();
    const socket = getSocket();

    if (notifyServer && isInRoom && currentMeeting && socket?.connected) {
      socket.emit('meeting:leave', { meetingId: currentMeeting.id });
    }

    // Cleanup WebRTC
    activeSocketCleanup?.();
    activeSocketCleanup = null;
    cleanupWebRTCListeners();
    closeAllPeerConnections();
    setLocalMediaStream(null);

    set({
      currentMeeting: null,
      isInRoom: false,
      isJoining: false,
      joinError: null,
      participants: new Map(),
      remoteStreams: new Map(),
      participantAudioEnabled: new Map(),
      participantVideoEnabled: new Map(),
      screenShare: null,
    });
  },

  setJoining: (isJoining) => {
    set({ isJoining });
  },

  setJoinError: (error) => {
    set({ joinError: error });
  },

  addParticipant: (payload) => {
    const { participants } = get();
    set({
      participants: new Map(participants).set(payload.userId, {
        userId: payload.userId,
        firstName: payload.user.firstName,
        lastName: payload.user.lastName,
        email: payload.user.email,
        joinedAt: payload.joinedAt,
      }),
    });
  },

  removeParticipant: (payload) => {
    const { participants } = get();
    const newParticipants = new Map(participants);
    newParticipants.delete(payload.userId);
    set({ participants: newParticipants });
  },

  clearParticipants: () => {
    set({ participants: new Map() });
  },

  updateMeetingStatus: (status, startedAt) => {
    set({
      currentMeeting: get().currentMeeting
        ? { ...get().currentMeeting!, status: status as 'live' | 'scheduled' | 'ended' | 'cancelled', startedAt }
        : null,
    });
  },

  addRemoteStream: (peerUserId, stream) => {
    const { remoteStreams } = get();
    set({ remoteStreams: new Map(remoteStreams).set(peerUserId, stream) });
  },

  removeRemoteStream: (peerUserId) => {
    const { remoteStreams } = get();
    remoteStreams.delete(peerUserId);
    set({ remoteStreams: new Map(remoteStreams) });
  },

  clearRemoteStreams: () => {
    set({ remoteStreams: new Map() });
  },

  setParticipantAudioEnabled: (peerUserId, enabled) => {
    const { participantAudioEnabled } = get();
    set({ participantAudioEnabled: new Map(participantAudioEnabled).set(peerUserId, enabled) });
  },

  setParticipantVideoEnabled: (peerUserId, enabled) => {
    const { participantVideoEnabled } = get();
    set({ participantVideoEnabled: new Map(participantVideoEnabled).set(peerUserId, enabled) });
  },

  setScreenShare: (screenShare) => set({ screenShare }),
}));
