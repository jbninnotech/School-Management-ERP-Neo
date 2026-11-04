import { describe, it, expect, vi } from 'vitest';
import {
  formatTime12h,
  formatDateTime12h,
  parseTime12h,
  calcDuration,
  addMinutes,
} from './timeUtils.js';

describe('Time Utilities (12-hour AM/PM & Asia/Kolkata)', () => {
  it('correctly handles 12:00 AM (midnight) edge case', () => {
    // 12:00 AM in Kolkata (+05:30) is 18:30 UTC previous day
    const midnightKolkata = new Date('2026-11-03T00:00:00+05:30');
    expect(formatTime12h(midnightKolkata)).toBe('12:00 AM');
    expect(formatTime12h(midnightKolkata, true)).toBe('12:00 AM (midnight)');
  });

  it('correctly handles 12:00 PM (noon) edge case', () => {
    const noonKolkata = new Date('2026-11-03T12:00:00+05:30');
    expect(formatTime12h(noonKolkata)).toBe('12:00 PM');
    expect(formatTime12h(noonKolkata, true)).toBe('12:00 PM (noon)');
  });

  it('correctly formats morning and afternoon times', () => {
    const morning = new Date('2026-11-03T10:30:00+05:30');
    expect(formatTime12h(morning)).toBe('10:30 AM');

    const afternoon = new Date('2026-11-03T14:15:00+05:30');
    expect(formatTime12h(afternoon)).toBe('02:15 PM');
  });

  it('correctly parses 12-hour strings to Date objects in Asia/Kolkata', () => {
    const parsedMidnight = parseTime12h('12:00 AM', '2026-11-03');
    expect(formatTime12h(parsedMidnight)).toBe('12:00 AM');

    const parsedNoon = parseTime12h('12:00 PM', '2026-11-03');
    expect(formatTime12h(parsedNoon)).toBe('12:00 PM');

    const parsedPm = parseTime12h('02:30 PM', '2026-11-03');
    expect(formatTime12h(parsedPm)).toBe('02:30 PM');
  });

  it('calculates duration and handles midnight crossing', () => {
    const start = parseTime12h('11:00 PM', '2026-11-03');
    const end = parseTime12h('01:00 AM', '2026-11-03'); // crossed midnight

    const duration = calcDuration(start, end);
    expect(duration).toBe(120); // 2 hours = 120 minutes
  });

  it('correctly adds minutes across hour boundaries', () => {
    const start = parseTime12h('11:45 AM', '2026-11-03');
    const end = addMinutes(start, 30);
    expect(formatTime12h(end)).toBe('12:15 PM');
  });
});
