import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RecordingLibrary from './RecordingLibrary';
import { meetingApi } from '../../services/meetingApi';

vi.mock('../../services/meetingApi', () => ({ meetingApi: {
  listRecordings: vi.fn(), getRecordingPlaybackTicket: vi.fn(), getTranscript: vi.fn(), deleteRecording: vi.fn(),
} }));
vi.mock('../../stores/authStore', () => ({ useAuthStore: () => ({ user: { id: 'host-1' } }) }));
const recording = { id: 'recording-1', meetingId: 'meeting-1', workspaceId: 'workspace-1', hostId: 'host-1', meetingTitle: 'Planning', status: 'completed' as const, durationMs: 125000, fileSize: 1000, format: 'webm/opus', mimeType: 'video/webm', createdAt: '2026-11-12T05:00:00.000Z', startedAt: '2026-11-12T05:00:00.000Z' };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(meetingApi.listRecordings).mockResolvedValue({ recordings: [recording] });
  vi.mocked(meetingApi.getRecordingPlaybackTicket).mockResolvedValue({ expiresAt: '2026-11-12T08:00:00.000Z', streamUrl: '/api/v1/recordings/recording-1/stream?ticket=play-token', downloadUrl: '/api/v1/recordings/recording-1/stream?ticket=download-token' });
  vi.mocked(meetingApi.getTranscript).mockResolvedValue({ segments: [{ id: 'segment-1', speakerId: 'speaker-1', speakerName: 'Sam', text: 'The first decision.', startAt: '2026-11-12T05:00:04.000Z', endAt: '2026-11-12T05:00:06.000Z', createdAt: '' }], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 }, attribution: 'authenticated speaker' });
  vi.mocked(meetingApi.deleteRecording).mockResolvedValue({} as never);
});
afterEach(() => cleanup());

describe('RecordingLibrary', () => {
  it('loads a workspace recording and opens secure playback with its transcript', async () => {
    render(<RecordingLibrary workspaceId="workspace-1" />);
    expect(await screen.findByText('Planning')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(await screen.findByText('The first decision.')).toBeInTheDocument();
    expect(meetingApi.getRecordingPlaybackTicket).toHaveBeenCalledWith('recording-1');
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('href', expect.stringContaining('download-token'));
  });

  it('allows the host to delete an owned recording', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    render(<RecordingLibrary workspaceId="workspace-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(meetingApi.deleteRecording).toHaveBeenCalledWith('recording-1'));
    vi.unstubAllGlobals();
  });
});
