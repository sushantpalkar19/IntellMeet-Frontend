import api from './authApi';
import type { Meeting, CreateMeetingInput, MessagesResponse } from '../types/meeting';

export interface MeetingListResponse {
  meetings: Meeting[];
}

export interface MeetingResponse {
  meeting: Meeting;
}

export interface EndMeetingResponse {
  message: string;
  meeting: { id: string; status: 'ended'; endedAt: string };
}

export interface JoinMeetingResponse {
  message: string;
  participant: {
    id: string;
    meetingId: string;
    userId: string;
    role: string;
    joinedAt: string;
  };
  meeting: {
    id: string;
    status: string;
    startedAt?: string;
  };
}

export const meetingApi = {
  startRecording: async (meetingId: string, mimeType: string) => (await api.post(`/v1/meetings/${meetingId}/recordings/start`, { mimeType })).data as { recording: MeetingRecording },
  consentToRecording: async (meetingId: string, recordingId: string, consented: boolean) => (await api.post(`/v1/meetings/${meetingId}/recordings/${recordingId}/consent`, { consented })).data as { recording: MeetingRecording },
  controlRecording: async (meetingId: string, recordingId: string, action: 'pause' | 'resume' | 'stop') => (await api.post(`/v1/meetings/${meetingId}/recordings/${recordingId}/${action}`)).data as { recording: MeetingRecording },
  uploadRecordingChunk: async (meetingId: string, recordingId: string, blob: Blob, metadata: { sequence: number; startMs: number; endMs: number }) => (await api.post(`/v1/meetings/${meetingId}/recordings/${recordingId}/chunks`, blob, { headers: { 'Content-Type': blob.type, 'X-Recording-Sequence': String(metadata.sequence), 'X-Recording-Start-Ms': String(metadata.startMs), 'X-Recording-End-Ms': String(metadata.endMs) }, timeout: 30000 })).data as { duplicate: boolean; uploaded: boolean },
  listRecordings: async (workspaceId: string) => (await api.get('/v1/recordings', { params: { workspaceId } })).data as { recordings: MeetingRecording[] },
  getRecordingPlaybackTicket: async (recordingId: string) => (await api.post(`/v1/recordings/${recordingId}/playback-ticket`)).data as { expiresAt: string; streamUrl: string; downloadUrl: string },
  deleteRecording: async (recordingId: string) => api.delete(`/v1/recordings/${recordingId}`),
  getMeetingSummary: async (meetingId: string) => (await api.get(`/v1/meetings/${meetingId}/summary`)).data as { summary: MeetingSummary | null },
  generateMeetingSummary: async (meetingId: string, regenerate = false) => (await api.post(`/v1/meetings/${meetingId}/summary/${regenerate ? 'regenerate' : 'generate'}`)).data as { summary: MeetingSummary },
  getMeetingActionItems: async (meetingId: string) => (await api.get(`/v1/meetings/${meetingId}/action-items`)).data as { actionItems: MeetingActionItem[] },
  updateMeetingActionItem: async (meetingId: string, actionItemId: string, input: { assigneeId?: string | null; dueDate?: string | null }) => (await api.patch(`/v1/meetings/${meetingId}/action-items/${actionItemId}`, input)).data as { actionItem: MeetingActionItem },
  updateMeetingActionItemStatus: async (meetingId: string, actionItemId: string, status: MeetingActionItem['status']) => (await api.patch(`/v1/meetings/${meetingId}/action-items/${actionItemId}/status`, { status })).data as { actionItem: MeetingActionItem },
  deleteMeetingActionItem: async (meetingId: string, actionItemId: string) => api.delete(`/v1/meetings/${meetingId}/action-items/${actionItemId}`),
  getTranscript: async (meetingId: string, page = 1, limit = 50) => {
    const response = await api.get(`/v1/meetings/${meetingId}/transcripts`, { params: { page, limit } });
    return response.data as { segments: Array<{ id: string; speakerId: string; speakerName: string; text: string; startAt: string; endAt: string; createdAt: string }>; pagination: { page: number; limit: number; total: number; totalPages: number }; attribution: string };
  },

  uploadTranscriptChunk: async (meetingId: string, chunk: Blob, metadata: { sessionId: string; transcriptionSessionId: string; sequence: number; chunkId: string; startMs: number; endMs: number }) => {
    const response = await api.post(`/v1/meetings/${meetingId}/transcripts/chunks`, chunk, {
      headers: {
        'Content-Type': chunk.type || 'audio/webm',
        'X-Transcript-Session': metadata.sessionId,
        'X-Transcription-Session': metadata.transcriptionSessionId,
        'X-Transcript-Sequence': String(metadata.sequence),
        'X-Transcript-Chunk-Id': metadata.chunkId,
        'X-Transcript-Start-Ms': String(metadata.startMs),
        'X-Transcript-End-Ms': String(metadata.endMs),
      },
      timeout: 45000,
    });
    return response.data;
  },

  getTranscriptTextExport: async (meetingId: string): Promise<Blob> => {
    const response = await api.get(`/v1/meetings/${meetingId}/transcripts/export.txt`, { responseType: 'blob' });
    return response.data as Blob;
  },
  getMeetingInvitation: async (meetingId: string): Promise<{ meetingId: string; joinCode: string; invitationId: string }> => {
    const response = await api.get(`/v1/meetings/${meetingId}/invitation`);
    return response.data;
  },

  joinByCode: async (code: string): Promise<{ meetingId: string; meetingCode: string }> => {
    const response = await api.post('/v1/meetings/join-by-code', { code });
    return response.data;
  },

  createMeeting: async (input: CreateMeetingInput): Promise<MeetingResponse> => {
    const response = await api.post<MeetingResponse>('/v1/meetings', input);
    return response.data;
  },

  listMeetings: async (workspaceId?: string, status?: string): Promise<MeetingListResponse> => {
    const params: Record<string, string> = {};
    if (workspaceId) params.workspaceId = workspaceId;
    if (status) params.status = status;
    const response = await api.get<MeetingListResponse>('/v1/meetings', { params });
    return response.data;
  },

  getMeeting: async (meetingId: string): Promise<MeetingResponse> => {
    const response = await api.get<MeetingResponse>(`/v1/meetings/${meetingId}`);
    return response.data;
  },

  joinMeeting: async (meetingId: string): Promise<JoinMeetingResponse> => {
    const response = await api.post<JoinMeetingResponse>(`/v1/meetings/${meetingId}/join`);
    return response.data;
  },

  endMeeting: async (meetingId: string): Promise<EndMeetingResponse> => {
    const response = await api.post<EndMeetingResponse>(`/v1/meetings/${meetingId}/end`);
    return response.data;
  },

  getMeetingMessages: async (meetingId: string, page = 1, limit = 50): Promise<MessagesResponse> => {
    const response = await api.get<MessagesResponse>(`/v1/meetings/${meetingId}/messages`, {
      params: { page: page.toString(), limit: limit.toString() },
    });
    return response.data;
  },
};

export interface MeetingSummary {
  id: string; meetingId: string; workspaceId: string; meetingTitle: string; meetingDate: string; overview: string; detailedSummary: string;
  discussionPoints: string[]; decisions: string[]; keyTakeaways: string[]; unresolvedQuestions: string[];
  generationStatus: 'idle' | 'processing' | 'completed' | 'failed'; generationError?: string; transcriptSegmentCount: number; generatedAt?: string;
}
export interface MeetingActionItem {
  id: string; meetingId: string; taskDescription: string; assigneeId: string | null; assigneeName: string | null; dueDate: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'; evidence: string; createdAt: string; updatedAt: string;
}
export interface MeetingRecording {
  id: string; meetingId: string; workspaceId: string; hostId: string; meetingTitle: string; status: 'awaiting_consent' | 'recording' | 'paused' | 'processing' | 'completed' | 'interrupted' | 'consent_denied' | 'failed';
  durationMs: number; fileSize: number; format: string; mimeType: string; createdAt: string; startedAt?: string; completedAt?: string;
}
