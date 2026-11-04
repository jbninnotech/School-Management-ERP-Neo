/**
 * 12-Hour Time & Date Utility Module
 * Timezone: Asia/Kolkata
 */

const TIMEZONE = 'Asia/Kolkata';

/**
 * Format a Date object or ISO string to 12-hour format e.g. "10:30 AM", "12:00 AM (midnight)", "12:00 PM (noon)"
 */
export function formatTime12h(dateInput, includePeriodQualifier = false) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  // Extract hours and minutes in Asia/Kolkata
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const parts = formatter.formatToParts(d);
  let hour = '';
  let minute = '';
  let dayPeriod = '';

  parts.forEach((p) => {
    if (p.type === 'hour') hour = p.value;
    if (p.type === 'minute') minute = p.value;
    if (p.type === 'dayPeriod') dayPeriod = p.value.toUpperCase();
  });

  // Zero pad hour to 2 digits for consistent UI display e.g. 02:15 PM
  const paddedHour = hour.padStart(2, '0');
  const baseTime = `${paddedHour}:${minute} ${dayPeriod}`;

  if (includePeriodQualifier) {
    if (paddedHour === '12' && minute === '00') {
      if (dayPeriod === 'AM') return '12:00 AM (midnight)';
      if (dayPeriod === 'PM') return '12:00 PM (noon)';
    }
  }

  return baseTime;
}

/**
 * Format date & time in 12-hour format e.g. "15/10/2026, 10:30 AM"
 */
export function formatDateTime12h(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return `${dateFormatter.format(d)}, ${formatTime12h(d)}`;
}

/**
 * Parse 12-hour time string ("10:30 AM", "12:00 AM", "12:30 PM") with a base date string ("YYYY-MM-DD")
 * into a UTC Date object in Asia/Kolkata timezone.
 */
export function parseTime12h(timeStr, baseDateStr = new Date().toISOString().slice(0, 10)) {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

  // 12-hour to 24-hour conversion
  if (period === 'AM') {
    if (hour === 12) hour = 0; // 12 AM is midnight (00:xx)
  } else if (period === 'PM') {
    if (hour !== 12) hour += 12; // 12 PM is noon (12:xx), 1 PM is 13:xx
  }

  const [year, month, day] = baseDateStr.split('-').map(Number);
  
  // Format as ISO in Kolkata (+05:30)
  const pad = (n) => String(n).padStart(2, '0');
  const kolkataIso = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+05:30`;
  const parsedDate = new Date(kolkataIso);
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
}

/**
 * Calculate duration in minutes between start and end dates (handles exams crossing midnight)
 */
export function calcDuration(startDateInput, endDateInput) {
  if (!startDateInput || !endDateInput) return 0;
  const start = new Date(startDateInput);
  let end = new Date(endDateInput);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  let diffMs = end.getTime() - start.getTime();
  // If end is earlier than start, user crossed midnight into the next day
  if (diffMs < 0) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    diffMs = end.getTime() - start.getTime();
  }

  return Math.max(0, Math.round(diffMs / (60 * 1000)));
}

/**
 * Add minutes to a date and return a new Date object
 */
export function addMinutes(dateInput, minutes) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() + Number(minutes) * 60 * 1000);
}
