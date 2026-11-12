import { describe, expect, it } from 'vitest';
import { formatInTimeZone, zonedDateTimeToUtc } from './schedulingApi';

describe('calendar timezone helpers', () => {
  it('converts a selected zone to UTC and formats it back in that zone', () => {
    const utc = zonedDateTimeToUtc('2026-11-12T09:30', 'Asia/Kolkata');
    expect(utc.toISOString()).toBe('2026-11-12T04:00:00.000Z');
    expect(formatInTimeZone(utc, 'Asia/Kolkata', { hour: 'numeric', minute: '2-digit' })).toMatch(/9:30/);
  });

  it('rejects a nonexistent daylight-saving time', () => {
    expect(() => zonedDateTimeToUtc('2027-03-14T02:30', 'America/New_York')).toThrow(/daylight-saving/);
    expect(() => zonedDateTimeToUtc('2026-11-01T01:30', 'America/New_York')).toThrow(/occurs twice/);
  });
});
