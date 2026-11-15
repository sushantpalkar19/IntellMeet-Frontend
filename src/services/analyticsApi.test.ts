import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./authApi', () => ({ default: { get } }));

import { analyticsApi } from './analyticsApi';

describe('dashboard analytics mapping', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps live plus upcoming and generated summaries from Analytics overview', async () => {
    get.mockResolvedValue({ data: { meetings: { live: 2, upcoming: 3 }, ai: { summariesGenerated: 4 } } });
    await expect(analyticsApi.getDashboardStats()).resolves.toEqual({ meetings: { active: 5 }, aiSummaries: 4 });
    expect(get).toHaveBeenCalledWith('/v1/analytics/overview', { params: expect.objectContaining({ from: expect.any(String), to: expect.any(String), groupBy: 'day' }) });
  });

  it('preserves zero counts from Analytics overview', async () => {
    get.mockResolvedValue({ data: { meetings: { live: 0, upcoming: 0 }, ai: { summariesGenerated: 0 } } });
    await expect(analyticsApi.getDashboardStats()).resolves.toEqual({ meetings: { active: 0 }, aiSummaries: 0 });
  });
});
