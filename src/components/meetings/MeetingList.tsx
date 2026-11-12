import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Meeting, CreateMeetingInput, MeetingStatus } from '../../types/meeting';
import { meetingApi } from '../../services/meetingApi';
import MeetingCard from './MeetingCard';
import NewMeetingModal from './NewMeetingModal';
import JoinMeetingModal from './JoinMeetingModal';
import MeetingActionModal from './MeetingActionModal';
import EndMeetingConfirmation from './EndMeetingConfirmation';

interface MeetingListProps {
  workspaceId: string;
  workspaceName?: string;
  canCreateMeeting?: boolean;
  currentUser?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export default function MeetingList({
  workspaceId,
  canCreateMeeting = true,
  currentUser,
}: MeetingListProps) {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<'all' | MeetingStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [meetingToEnd, setMeetingToEnd] = useState<Meeting | null>(null);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);
  const [endMeetingError, setEndMeetingError] = useState<string | null>(null);

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadMeetings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await meetingApi.listMeetings(workspaceId);
      setMeetings(response.meetings);
      setIsLoading(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to load workspace meetings. Please try again.');
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    let isMounted = true;
    loadMeetings()
      .then(() => {
        if (isMounted) setIsLoading(false);
      })
      .catch(() => {
        if (isMounted) {
          setError('Failed to load workspace meetings. Please try again.');
          setIsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [loadMeetings]);

  const handleCreateMeeting = async (input: CreateMeetingInput) => {
    try {
      const response = await meetingApi.createMeeting({ ...input, workspaceId });
      setMeetings((prev) => [response.meeting, ...prev]);
      setFeedbackMessage(`Meeting "${response.meeting.title}" created successfully.`);
      setTimeout(() => setFeedbackMessage(null), 5000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Unable to create meeting.');
    }
  };

  const handleJoinClick = (meeting: Meeting) => {
    if (meeting.status === 'ended' || meeting.status === 'cancelled') return;
    navigate(`/meeting/${meeting.id}`);
  };

  const confirmEndMeeting = async () => {
    if (!meetingToEnd) return;
    setIsEndingMeeting(true);
    setEndMeetingError(null);
    try {
      const response = await meetingApi.endMeeting(meetingToEnd.id);
      setMeetings((items) => items.map((meeting) => meeting.id === meetingToEnd.id
        ? { ...meeting, status: 'ended', endedAt: response.meeting.endedAt }
        : meeting));
      setFeedbackMessage(`Meeting "${meetingToEnd.title}" ended for everyone.`);
      setMeetingToEnd(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setEndMeetingError(error.response?.data?.message || 'Unable to end the meeting. Please try again.');
    } finally {
      setIsEndingMeeting(false);
    }
  };

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      const matchesFilter = activeFilter === 'all' || m.status === activeFilter;
      const matchesSearch =
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [meetings, activeFilter, searchQuery]);

  const counts = useMemo(() => ({
    all: meetings.length,
    live: meetings.filter((m) => m.status === 'live').length,
    scheduled: meetings.filter((m) => m.status === 'scheduled').length,
    ended: meetings.filter((m) => m.status === 'ended').length,
  }), [meetings]);

  return (
    <div className="bg-white dark:bg-[#151522] border border-purple-100/70 dark:border-purple-900/30 rounded-2xl p-6 shadow-sm">

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-100 dark:border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-white">Workspace Meetings</h2>
          </div>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-0.5">
            Coordinate video conferences, sync with team members, and manage scheduled calls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsJoinModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl text-[#0F172A] dark:text-slate-200 bg-white dark:bg-[#1C1C2E] hover:border-purple-300 dark:hover:border-purple-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          >
            <svg className="w-3.5 h-3.5 text-[#64748B] dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Join Meeting
          </button>

          {canCreateMeeting && (
            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-[#6D28D9] hover:bg-[#5B21B6] dark:bg-[#7C3AED] dark:hover:bg-[#6D28D9] shadow-md shadow-purple-900/20 transition-all focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Meeting
            </button>
          )}
        </div>
      </div>

      {/* Action Feedback */}
      {feedbackMessage && (
        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{feedbackMessage}</span>
          </div>
          <button type="button" onClick={() => setFeedbackMessage(null)} className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 ml-2">
            &times;
          </button>
        </div>
      )}

      {/* Filters + Search */}
      <div className="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Filter pills */}
        <div className="flex flex-wrap gap-1 p-1 bg-slate-50 dark:bg-[#1C1C2E] rounded-xl border border-slate-200 dark:border-slate-700">
          {(
            [
              { key: 'all', label: `All (${counts.all})`, dot: null },
              { key: 'live', label: `Live (${counts.live})`, dot: 'bg-emerald-500' },
              { key: 'scheduled', label: `Scheduled (${counts.scheduled})`, dot: 'bg-blue-500' },
              { key: 'ended', label: `Ended (${counts.ended})`, dot: 'bg-slate-400' },
            ] as const
          ).map(({ key, label, dot }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFilter(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeFilter === key
                  ? 'bg-white dark:bg-[#0B0B14] text-[#0F172A] dark:text-white shadow-sm font-semibold'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              {dot && <span className={`w-2 h-2 rounded-full ${dot}`} />}
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meetings…"
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-[#0B0B14] text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="mt-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-[3px] border-[#6D28D9] border-t-transparent animate-spin" />
            <p className="mt-3 text-xs text-[#64748B] dark:text-slate-400 font-medium">Loading workspace meetings…</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 rounded-xl">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
            <button
              type="button"
              onClick={loadMeetings}
              className="mt-3 inline-flex items-center px-3.5 py-1.5 text-xs font-medium rounded-xl text-red-700 dark:text-red-300 bg-white dark:bg-[#151522] border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="text-center py-14 px-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-[#1C1C2E]/40">
            <div className="w-12 h-12 mx-auto rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-[#C4B5FD] flex items-center justify-center mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            {searchQuery || activeFilter !== 'all' ? (
              <>
                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">No matching meetings found</h3>
                <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 max-w-sm mx-auto">No meetings match your selected filters or search query.</p>
                <button
                  type="button"
                  onClick={() => { setActiveFilter('all'); setSearchQuery(''); }}
                  className="mt-3 px-3.5 py-1.5 text-xs font-medium text-[#6D28D9] dark:text-[#C4B5FD] bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-950 rounded-xl transition-colors"
                >
                  Clear all filters
                </button>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">No meetings in this workspace</h3>
                <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Host real-time standups, design reviews, and sync calls with your team.
                </p>
                {canCreateMeeting && (
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(true)}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-xl shadow-sm transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Your First Meeting
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMeetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} onJoin={handleJoinClick} onEndMeeting={(item) => { setEndMeetingError(null); setMeetingToEnd(item); }} currentUserId={currentUser?.id} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <NewMeetingModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreate={handleCreateMeeting}
        workspaceId={workspaceId}
      />
      <JoinMeetingModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} availableMeetings={meetings} onSelectMeeting={handleJoinClick} />
      <MeetingActionModal meeting={selectedMeeting} isOpen={Boolean(selectedMeeting)} onClose={() => setSelectedMeeting(null)} />
      <EndMeetingConfirmation meetingTitle={meetingToEnd?.title ?? ''} isOpen={Boolean(meetingToEnd)} isEnding={isEndingMeeting} error={endMeetingError} onCancel={() => setMeetingToEnd(null)} onConfirm={() => void confirmEndMeeting()} />
    </div>
  );
}
