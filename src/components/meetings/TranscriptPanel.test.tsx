import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import TranscriptPanel from './TranscriptPanel';
import { meetingApi } from '../../services/meetingApi';

const { socket } = vi.hoisted(() => ({ socket: { connected: true, emit: vi.fn(), on: vi.fn(), off: vi.fn() } }));
const { savePdf } = vi.hoisted(() => ({ savePdf: vi.fn() }));
vi.mock('../../services/socket', () => ({ getSocket: () => socket }));
vi.mock('../../services/meetingApi', () => ({ meetingApi: {
  getTranscript: vi.fn().mockResolvedValue({ segments: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 }, attribution: 'Authenticated source attribution; no voice diarization.' }),
  uploadTranscriptChunk: vi.fn(), getTranscriptTextExport: vi.fn(),
} }));
vi.mock('jspdf', () => {
  class FakeJsPDF {
    setFontSize() {}
    text() {}
    splitTextToSize(value: string) { return [value]; }
    addPage() {}
    save(name: string) { savePdf(name); }
  }
  return { jsPDF: FakeJsPDF };
});

describe('TranscriptPanel', () => {
  beforeEach(() => { cleanup(); vi.clearAllMocks(); socket.connected = true; });

  it('shows transcription controls only to the host and sends a start event', () => {
    const { rerender } = render(<TranscriptPanel meetingId="meeting-1" microphoneTrack={null} microphoneEnabled={false} isHost={false} />);
    expect(screen.queryByRole('button', { name: 'Start transcription' })).not.toBeInTheDocument();
    rerender(<TranscriptPanel meetingId="meeting-1" microphoneTrack={null} microphoneEnabled={false} isHost />);
    fireEvent.click(screen.getByRole('button', { name: 'Start transcription' }));
    expect(socket.emit).toHaveBeenCalledWith('transcription:start', expect.objectContaining({ meetingId: 'meeting-1', sessionId: expect.any(String) }));
  });

  it('loads prior transcript pages from the authorized meeting API', async () => {
    render(<TranscriptPanel meetingId="meeting-1" microphoneTrack={null} microphoneEnabled={false} isHost={false} />);
    expect(meetingApi.getTranscript).toHaveBeenCalledWith('meeting-1', 1, 100);
  });

  it('exports a PDF using transcript content from the backend', async () => {
    render(<TranscriptPanel meetingId="meeting-1" microphoneTrack={null} microphoneEnabled={false} isHost={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }));
    await vi.waitFor(() => expect(savePdf).toHaveBeenCalledWith('intellmeet-transcript-meeting-1.pdf'));
  });
});
