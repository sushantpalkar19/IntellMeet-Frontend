import api from './authApi';

export interface AnalyticsFilters { from: string; to: string; workspaceId?: string; groupBy: 'day' | 'week' | 'month'; }
export interface OverviewAnalytics { range: { from: string; to: string }; meetings: { total: number; completed: number; live: number; upcoming: number; cancelled: number; totalDurationMs: number; averageDurationMs: number | null; durationSampleCount: number }; attendanceRecords: number; ai: { summariesGenerated: number }; tasks: { total: number; todo: number; inProgress: number; completed: number }; }
export interface MeetingAnalytics { groupBy: string; unit: string; activity: Array<{ _id: string; count: number }>; status: Record<string, number>; durations: Array<{ _id: string; totalMs: number; averageMs: number; count: number }>; byWorkspace: Array<{ workspaceId: string; name: string; count: number }>; attendance: Array<{ _id: string; attendanceRecords: number; meetingCount: number }>; }
export interface TaskAnalytics { total: number; completed: number; todo: number; inProgress: number; completionPercent: number | null; priorities: Record<string, number>; byWorkspace: Array<{ workspaceId: string; name: string; count: number; completed: number }>; byAssignee: Array<{ workspaceId: string; userId: string; name: string; assigned: number; completed: number }>; }
export interface AiAnalytics { transcriptMeetings: number; transcriptSegments: number; summariesGenerated: number; meetingsWithSummaries: number; actionItems: number; recordings: number; meetingsWithRecordings: number; }
export interface WorkspaceAnalytics { workspaces: Array<{ id: string; name: string; meetings: number; completed: number; tasks: number; completedTasks: number }>; page: number; limit: number; }

export const analyticsApi = {
  getOverview: async (filters: AnalyticsFilters) => (await api.get<OverviewAnalytics>('/v1/analytics/overview', { params: filters })).data,
  getMeetings: async (filters: AnalyticsFilters) => (await api.get<MeetingAnalytics>('/v1/analytics/meetings', { params: filters })).data,
  getTasks: async (filters: AnalyticsFilters) => (await api.get<TaskAnalytics>('/v1/analytics/tasks', { params: filters })).data,
  getAi: async (filters: AnalyticsFilters) => (await api.get<AiAnalytics>('/v1/analytics/ai', { params: filters })).data,
  getWorkspaces: async (filters: AnalyticsFilters) => (await api.get<WorkspaceAnalytics>('/v1/analytics/workspaces', { params: filters })).data,
};
