export type MeetingStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

export type MeetingParticipantRole = 'host' | 'co-host' | 'participant';

export interface MeetingUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface MeetingParticipant {
  id: string;
  userId: string;
  meetingId: string;
  role: MeetingParticipantRole;
  joinedAt: string;
  leftAt?: string;
}

export interface Meeting {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  status: MeetingStatus;
  createdBy: string;
  meetingCode?: string;
  createdByUser?: MeetingUser;
  participantCount?: number;
  participants?: MeetingParticipant[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateMeetingInput {
  workspaceId: string;
  title: string;
  description?: string;
  scheduledAt?: string;
}

// Socket event types
export interface MeetingJoinPayload {
  meetingId: string;
}

export interface MeetingJoinedResponse {
  meetingId: string;
  meeting: {
    id: string;
    title: string;
    status: MeetingStatus;
    startedAt?: string;
  };
}

export interface MeetingLeftResponse {
  meetingId: string;
}

export interface MeetingStartedResponse {
  meetingId: string;
  status: 'live';
  startedAt: string;
}

export interface Participant {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  joinedAt: string;
}

export interface ParticipantJoinedPayload {
  meetingId: string;
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  joinedAt: string;
}

export interface ParticipantLeftPayload {
  meetingId: string;
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface SocketErrorPayload {
  message: string;
}

// Chat types
export interface ChatMessage {
  id: string;
  meetingId: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  content: string;
  messageType: 'text' | 'system';
  createdAt: string;
}

export interface ChatSendPayload {
  meetingId: string;
  content: string;
}

export interface ChatNewPayload {
  meetingId: string;
  message: ChatMessage;
}

export interface MessagesResponse {
  messages: ChatMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// WebRTC types
export interface WebRTCOfferPayload {
  meetingId: string;
  fromUserId: string;
  offer: RTCSessionDescriptionInit;
}

export interface WebRTCAnswerPayload {
  meetingId: string;
  fromUserId: string;
  answer: RTCSessionDescriptionInit;
}

export interface WebRTCIceCandidatePayload {
  meetingId: string;
  fromUserId: string;
  candidate: RTCIceCandidateInit;
}

export interface WebRTCLeavePayload {
  meetingId: string;
  fromUserId: string;
}

// Media state types
export interface MediaStateUpdatePayload {
  meetingId: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

export interface ParticipantMediaStatePayload {
  meetingId: string;
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  audioEnabled: boolean;
  videoEnabled: boolean;
}

