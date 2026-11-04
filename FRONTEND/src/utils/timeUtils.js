/**
 * 12-Hour Time & Date Utility Module
 * Timezone: Asia/Kolkata
 */

const TIMEZONE = 'Asia/Kolkata';

export function formatTime12h(dateInput, includePeriodQualifier = false) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

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

export function parseTime12h(timeStr, baseDateStr = new Date().toISOString().slice(0, 10)) {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

  if (period === 'AM') {
    if (hour === 12) hour = 0; // 12 AM is midnight
  } else if (period === 'PM') {
    if (hour !== 12) hour += 12; // 12 PM is noon
  }

  const [year, month, day] = baseDateStr.split('-').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  const kolkataIso = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+05:30`;
  const parsedDate = new Date(kolkataIso);
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export function calcDuration(startDateInput, endDateInput) {
  if (!startDateInput || !endDateInput) return 0;
  const start = new Date(startDateInput);
  let end = new Date(endDateInput);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  let diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    diffMs = end.getTime() - start.getTime();
  }

  return Math.max(0, Math.round(diffMs / (60 * 1000)));
}

export function addMinutes(dateInput, minutes) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() + Number(minutes) * 60 * 1000);
}
