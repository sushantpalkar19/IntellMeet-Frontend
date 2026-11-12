/**
 * Mock Meeting Data Service
 *
 * NOTE: This mock dataset and provider is DEPRECATED.
 * Backend meeting REST endpoints and Socket.IO real-time signaling are now implemented.
 * This file is kept for reference but should not be used in production.
 *
 * The types in this file have been updated to match the current backend API.
 */

import type { Meeting, CreateMeetingInput } from '../types/meeting';

// Generate dynamic ISO dates relative to current execution time
const now = new Date();
const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
const tomorrowTwoPm = new Date(now.getTime() + 24 * 60 * 60 * 1000);
tomorrowTwoPm.setHours(14, 0, 0, 0);
const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
threeDaysLater.setHours(11, 0, 0, 0);
const yesterdayOnePm = new Date(now.getTime() - 24 * 60 * 60 * 1000);
yesterdayOnePm.setHours(13, 0, 0, 0);
const yesterdayTwoPm = new Date(yesterdayOnePm.getTime() + 50 * 60 * 1000);

export const INITIAL_MOCK_MEETINGS: Meeting[] = [
  {
    id: 'meet-mock-001',
    workspaceId: 'workspace-default',
    title: 'Daily Engineering Standup & Blocker Sync',
    description: 'Quick round-table on active pull requests, CI/CD pipeline improvements, and Phase 6 deliverables.',
    scheduledAt: fifteenMinutesAgo,
    startedAt: fifteenMinutesAgo,
    status: 'live',
    createdBy: 'user-001',
    createdByUser: {
      id: 'user-001',
      firstName: 'Alex',
      lastName: 'Chen',
      email: 'alex.chen@intellmeet.io',
    },
    participantCount: 4,
    createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'meet-mock-002',
    workspaceId: 'workspace-default',
    title: 'Product Design & WebRTC User Experience Review',
    description: 'Reviewing design system consistency, meeting controls layout, responsive grid breakpoints, and audio/video indicators.',
    scheduledAt: tomorrowTwoPm.toISOString(),
    status: 'scheduled',
    createdBy: 'user-002',
    createdByUser: {
      id: 'user-002',
      firstName: 'Sarah',
      lastName: 'Miller',
      email: 'sarah.miller@intellmeet.io',
    },
    participantCount: 6,
    createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'meet-mock-003',
    workspaceId: 'workspace-default',
    title: 'Enterprise Security & Signaling Architecture Alignment',
    description: 'Technical evaluation of STUN/TURN server deployment, JWT room authorization, and ICE candidate exchange.',
    scheduledAt: threeDaysLater.toISOString(),
    status: 'scheduled',
    createdBy: 'user-003',
    createdByUser: {
      id: 'user-003',
      firstName: 'David',
      lastName: 'Kowalski',
      email: 'david.k@intellmeet.io',
    },
    participantCount: 3,
    createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'meet-mock-004',
    workspaceId: 'workspace-default',
    title: 'Sprint 5 Retrospective & AI Meeting Summary Demo',
    description: 'Reviewing team velocity, automated transcription tests, and workspace collaboration milestones.',
    scheduledAt: yesterdayOnePm.toISOString(),
    startedAt: yesterdayOnePm.toISOString(),
    endedAt: yesterdayTwoPm.toISOString(),
    status: 'ended',
    createdBy: 'user-001',
    createdByUser: {
      id: 'user-001',
      firstName: 'Alex',
      lastName: 'Chen',
      email: 'alex.chen@intellmeet.io',
    },
    participantCount: 8,
    createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
  },
];

// In-memory collection per browser session for UI preview
let mockMeetingsState: Meeting[] = [...INITIAL_MOCK_MEETINGS];

/**
 * Fetch mock meetings for a workspace with simulated network latency
 */
export async function fetchMockMeetings(
  _workspaceId?: string,
  filterStatus?: string
): Promise<Meeting[]> {
  // Simulate 200ms API response time
  await new Promise((resolve) => setTimeout(resolve, 200));

  let results = [...mockMeetingsState];

  if (filterStatus && filterStatus !== 'all') {
    results = results.filter((m) => m.status === filterStatus);
  }

  // Sort: live first, then scheduled (soonest first), then ended (most recent first)
  return results.sort((a, b) => {
    const statusWeight: Record<string, number> = {
      live: 0,
      scheduled: 1,
      ended: 2,
      cancelled: 3,
    };
    const weightDiff = (statusWeight[a.status] ?? 99) - (statusWeight[b.status] ?? 99);
    if (weightDiff !== 0) return weightDiff;
    return new Date(b.scheduledAt || b.createdAt).getTime() - new Date(a.scheduledAt || a.createdAt).getTime();
  });
}

/**
 * Add a meeting locally in the UI preview
 */
export async function createMockMeeting(
  workspaceId: string,
  input: CreateMeetingInput,
  currentUser?: { id?: string; firstName?: string; lastName?: string; email?: string }
): Promise<Meeting> {
  await new Promise((resolve) => setTimeout(resolve, 250));

  const scheduledDate = input.scheduledAt ? new Date(input.scheduledAt) : undefined;
  const isNow = scheduledDate && Math.abs(scheduledDate.getTime() - Date.now()) < 5 * 60 * 1000;

  const newMeeting: Meeting = {
    id: `meet-mock-${Date.now().toString(36)}`,
    workspaceId,
    title: input.title,
    description: input.description || 'No description provided.',
    scheduledAt: input.scheduledAt,
    startedAt: isNow ? new Date().toISOString() : undefined,
    status: isNow ? 'live' : 'scheduled',
    createdBy: currentUser?.id || 'current-user',
    createdByUser: {
      id: currentUser?.id || 'current-user',
      firstName: currentUser?.firstName || 'Current',
      lastName: currentUser?.lastName || 'User',
      email: currentUser?.email || 'user@intellmeet.io',
    },
    participantCount: 1,
    createdAt: new Date().toISOString(),
  };

  mockMeetingsState = [newMeeting, ...mockMeetingsState];
  return newMeeting;
}

