import React from 'react';

/**
 * 12-Hour AM/PM TimePicker Component
 * Does NOT use <input type="time"> (which defaults to 24-hour in many browsers).
 * Accepts value e.g. "10:30 AM" or props { hour, minute, period } and triggers onChange("HH:MM AM/PM")
 */
export default function TimePicker({
  value = '10:00 AM',
  onChange,
  disabled = false,
  id,
  className = '',
}) {
  // Parse current value
  const parseVal = (val) => {
    const match = (val || '10:00 AM').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return { hour: '10', minute: '00', period: 'AM' };
    return {
      hour: String(parseInt(match[1], 10)).padStart(2, '0'),
      minute: match[2],
      period: match[3].toUpperCase(),
    };
  };

  const parsed = parseVal(value);

  const handleHourChange = (e) => {
    const newHour = e.target.value;
    onChange?.(`${newHour}:${parsed.minute} ${parsed.period}`);
  };

  const handleMinuteChange = (e) => {
    const newMinute = e.target.value;
    onChange?.(`${parsed.hour}:${newMinute} ${parsed.period}`);
  };

  const handlePeriodChange = (e) => {
    const newPeriod = e.target.value;
    onChange?.(`${parsed.hour}:${parsed.minute} ${newPeriod}`);
  };

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  // 5-minute steps or 1-minute steps
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  return (
    <div
      id={id}
      className={`d-inline-flex align-items-center gap-1 p-1 border rounded bg-white ${className}`}
      style={{ maxWidth: '280px' }}
      data-testid="timepicker-container"
    >
      <select
        aria-label="Hour"
        className="form-select form-select-sm text-center fw-semibold"
        style={{ width: '75px' }}
        value={parsed.hour}
        onChange={handleHourChange}
        disabled={disabled}
        data-testid="timepicker-hour"
      >
        {hours.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>

      <span className="fw-bold text-muted">:</span>

      <select
        aria-label="Minute"
        className="form-select form-select-sm text-center fw-semibold"
        style={{ width: '75px' }}
        value={parsed.minute}
        onChange={handleMinuteChange}
        disabled={disabled}
        data-testid="timepicker-minute"
      >
        {minutes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <select
        aria-label="AM or PM"
        className="form-select form-select-sm text-center fw-bold text-primary"
        style={{ width: '75px' }}
        value={parsed.period}
        onChange={handlePeriodChange}
        disabled={disabled}
        data-testid="timepicker-period"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
