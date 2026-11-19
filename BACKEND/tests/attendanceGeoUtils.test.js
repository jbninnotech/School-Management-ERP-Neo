import { describe, it, expect } from 'vitest';
import { calculateHaversineDistance, parseTimeToMinutes, getFormattedDate, getWeekdayName } from '../src/utils/geoUtils.js';

describe('Geo & Time Utils Test Suite for Teacher Attendance', () => {
  it('calculates 0 distance for identical coordinates', () => {
    const dist = calculateHaversineDistance(28.6139, 77.2090, 28.6139, 77.2090);
    expect(dist).toBe(0);
  });

  it('calculates approximately accurate distance within 50-meter radius', () => {
    // 28.6139, 77.2090 vs 28.6141, 77.2090 (~22 meters north)
    const dist = calculateHaversineDistance(28.6139, 77.2090, 28.6141, 77.2090);
    expect(dist).toBeGreaterThan(15);
    expect(dist).toBeLessThan(30);
  });

  it('detects locations far beyond the 50-meter limit', () => {
    // ~1.1km difference
    const dist = calculateHaversineDistance(28.6139, 77.2090, 28.6239, 77.2090);
    expect(dist).toBeGreaterThan(1000);
  });

  it('returns Infinity for invalid/missing coordinates', () => {
    expect(calculateHaversineDistance(undefined, 77.2090, 28.6139, 77.2090)).toBe(Infinity);
    expect(calculateHaversineDistance(28.6139, NaN, 28.6139, 77.2090)).toBe(Infinity);
  });

  it('parses "HH:mm" time strings accurately into minutes', () => {
    expect(parseTimeToMinutes('09:00')).toBe(540);
    expect(parseTimeToMinutes('09:15')).toBe(555);
    expect(parseTimeToMinutes('17:00')).toBe(1020);
    expect(parseTimeToMinutes('00:00')).toBe(0);
  });

  it('formats dates into YYYY-MM-DD correctly', () => {
    const testDate = new Date(2026, 10, 18); // Nov 18 2026
    expect(getFormattedDate(testDate)).toBe('2026-11-18');
  });

  it('resolves correct weekday name', () => {
    const testDate = new Date(2026, 10, 18); // Wednesday
    expect(getWeekdayName(testDate)).toBe('Wednesday');
  });
});
