import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Meeting } from '../../types/meeting';
import MeetingCard from './MeetingCard';
import EndMeetingConfirmation from './EndMeetingConfirmation';
import MediaControls from './MediaControls';

vi.mock('../../services/meetingApi', () => ({ meetingApi: { getMeetingInvitation: vi.fn() } }));
afterEach(cleanup);

const liveMeeting: Meeting = {
  id: 'meeting-1', workspaceId: 'workspace-1', title: 'Planning', description: '',
  status: 'live', createdBy: 'host-1', createdAt: '2026-11-11T00:00:00Z',
};

describe('meeting end controls', () => {
  it('shows End Meeting only to the host while keeping Join Now for participants', () => {
    const onEnd = vi.fn();
    const onJoin = vi.fn();
    const { rerender } = render(<MeetingCard meeting={liveMeeting} currentUserId="host-1" onEndMeeting={onEnd} onJoin={onJoin} />);
    fireEvent.click(screen.getByRole('button', { name: 'End Meeting' }));
    expect(onEnd).toHaveBeenCalledWith(liveMeeting);
    expect(screen.getByRole('button', { name: 'Join Now' })).toBeInTheDocument();

    rerender(<MeetingCard meeting={liveMeeting} currentUserId="member-2" onEndMeeting={onEnd} onJoin={onJoin} />);
    expect(screen.queryByRole('button', { name: 'End Meeting' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join Now' })).toBeInTheDocument();
  });

  it('shows ended status without a join action', () => {
    render(<MeetingCard meeting={{ ...liveMeeting, status: 'ended' }} currentUserId="member-2" onJoin={vi.fn()} />);
    expect(screen.getByText('Ended')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Join Now' })).not.toBeInTheDocument();
    expect(screen.getByText('Concluded')).toBeInTheDocument();
  });

  it('confirms that ending disconnects everyone before invoking the action', () => {
    const onConfirm = vi.fn();
    render(<EndMeetingConfirmation meetingTitle="Planning" isOpen isEnding={false} onCancel={vi.fn()} onConfirm={onConfirm} />);
    expect(screen.getByText(/disconnect all participants/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'End meeting' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('shows the meeting-wide end control only for the host', () => {
    const props = { audioEnabled: true, videoEnabled: true, onToggleAudio: vi.fn(), onToggleVideo: vi.fn(), onLeave: vi.fn(), onEndMeeting: vi.fn(), onToggleScreenShare: vi.fn(), screenSharing: false, disabled: false };
    const { rerender } = render(<MediaControls {...props} isHost={false} />);
    expect(screen.queryByRole('button', { name: 'End for everyone' })).not.toBeInTheDocument();
    rerender(<MediaControls {...props} isHost />);
    expect(screen.getByRole('button', { name: 'End for everyone' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave Meeting' })).toBeInTheDocument();
  });
});
