import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MeetingNotesPanel from './MeetingNotesPanel';
import { meetingApi } from '../../services/meetingApi';

const { mockPdfSave } = vi.hoisted(() => ({ mockPdfSave: vi.fn((_name: string) => undefined) }));
vi.mock('jspdf', () => {
  class FakeJsPDF {
    setFontSize() {}
    setFont() {}
    splitTextToSize(text: string) { return [text]; }
    addPage() {}
    text() {}
    save(name: string) { mockPdfSave(name); }
  }
  return { jsPDF: FakeJsPDF };
});

vi.mock('../../services/meetingApi', () => ({ meetingApi: {
  getMeetingSummary: vi.fn(), getMeetingActionItems: vi.fn(), getTranscript: vi.fn(), generateMeetingSummary: vi.fn(),
  updateMeetingActionItem: vi.fn(), updateMeetingActionItemStatus: vi.fn(), deleteMeetingActionItem: vi.fn(),
} }));

const summary = { id: 'summary-1', meetingId: 'meeting-1', workspaceId: 'workspace-1', meetingTitle: 'Planning', meetingDate: '2026-11-11T10:00:00.000Z', overview: 'Discussed launch risks.', detailedSummary: 'The team reviewed launch risks.', discussionPoints: ['Launch'], decisions: ['Review risks'], keyTakeaways: ['Risk review'], unresolvedQuestions: [], generationStatus: 'completed' as const, transcriptSegmentCount: 1 };
const item = { id: 'action-1', meetingId: 'meeting-1', taskDescription: 'Prepare the launch checklist', assigneeId: 'speaker-1', assigneeName: 'Ari Example', dueDate: null, status: 'PENDING' as const, evidence: 'Ari will prepare the launch checklist', createdAt: '', updatedAt: '' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(meetingApi.getMeetingSummary).mockResolvedValue({ summary });
  vi.mocked(meetingApi.getMeetingActionItems).mockResolvedValue({ actionItems: [item] });
  vi.mocked(meetingApi.getTranscript).mockResolvedValue({ segments: [{ id: 'segment-1', speakerId: 'speaker-1', speakerName: 'Ari Example', text: item.evidence, startAt: '', endAt: '', createdAt: '' }], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 }, attribution: 'authenticated' });
  vi.mocked(meetingApi.updateMeetingActionItemStatus).mockResolvedValue({ actionItem: { ...item, status: 'IN_PROGRESS' } });
});
afterEach(() => cleanup());

describe('MeetingNotesPanel', () => {
  it('renders structured notes and lets an authorized user change action status', async () => {
    render(<MeetingNotesPanel meetingId="meeting-1" meetingTitle="Planning" />);
    expect((await screen.findAllByText('Discussed launch risks.')).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Status for Prepare the launch checklist'), { target: { value: 'IN_PROGRESS' } });
    await waitFor(() => expect(meetingApi.updateMeetingActionItemStatus).toHaveBeenCalledWith('meeting-1', 'action-1', 'IN_PROGRESS'));
  });

  it('shows authorized workspace members the generation control when notes do not exist', async () => {
    vi.mocked(meetingApi.getMeetingSummary).mockResolvedValue({ summary: null });
    vi.mocked(meetingApi.getMeetingActionItems).mockResolvedValue({ actionItems: [] });
    render(<MeetingNotesPanel meetingId="meeting-1" meetingTitle="Planning" />);
    await screen.findByText(/Create a concise summary/);
    expect(await screen.findByRole('button', { name: 'Generate Summary' })).toBeInTheDocument();
  });

  it('generates notes and reloads action items', async () => {
    vi.mocked(meetingApi.getMeetingSummary).mockResolvedValueOnce({ summary: null }).mockResolvedValue({ summary });
    vi.mocked(meetingApi.getMeetingActionItems).mockResolvedValueOnce({ actionItems: [] }).mockResolvedValue({ actionItems: [item] });
    vi.mocked(meetingApi.generateMeetingSummary).mockResolvedValue({ summary });
    render(<MeetingNotesPanel meetingId="meeting-1" meetingTitle="Planning" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Generate Summary' }));
    await waitFor(() => expect(meetingApi.generateMeetingSummary).toHaveBeenCalledWith('meeting-1', false));
    expect((await screen.findAllByText('Discussed launch risks.')).length).toBeGreaterThan(0);
  });

  it('exports summary and action items to a PDF report', async () => {
    render(<MeetingNotesPanel meetingId="meeting-1" meetingTitle="Planning" />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Export PDF' }))[0]);
    await waitFor(() => expect(mockPdfSave).toHaveBeenCalledWith('intellmeet-meeting-report-meeting-1.pdf'));
  });
});
