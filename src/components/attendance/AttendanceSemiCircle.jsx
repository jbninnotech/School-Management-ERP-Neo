import React from 'react';

/**
 * 180-Degree Semicircular Attendance Circle Gauge
 * Visual arc from 0 deg (bottom left) to 180 deg (bottom right)
 *
 * @param {number} percentage - Progress percentage (0 - 100)
 * @param {string} status - Attendance status ('Working', 'Completed', 'Late', 'Half Day', etc.)
 * @param {number} completedMinutes - Effective completed working minutes
 * @param {number} requiredMinutes - Required working minutes (e.g. 480)
 * @param {number} remainingMinutes - Remaining working minutes
 */
export default function AttendanceSemiCircle({
  percentage = 0,
  status = 'Not Punched In',
  completedMinutes = 0,
  requiredMinutes = 480,
  remainingMinutes = 480,
  size = 280,
}) {
  // Clamp percentage between 0 and 100
  const clampedPercent = Math.min(100, Math.max(0, Number(percentage) || 0));

  // Semicircle geometry calculations
  const strokeWidth = 18;
  const radius = (size - strokeWidth * 2) / 2;
  const cx = size / 2;
  const cy = size / 2 + 20;

  // Perimeter of a semicircle = PI * radius
  const arcLength = Math.PI * radius;
  // Stroke-dashoffset fills proportionally from 0 to 180 degrees
  const strokeDashoffset = arcLength - (arcLength * clampedPercent) / 100;

  // Format minutes into "XH YM"
  const formatHrsMins = (mins) => {
    const m = Math.max(0, Math.round(mins || 0));
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return `${h}H ${rem}M`;
  };

  // Status-dependent gradient and badge styling
  const getStatusColor = (st) => {
    switch (st) {
      case 'Working':
      case 'Present':
        return {
          stroke: 'url(#attendanceGreenGradient)',
          bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
          dot: 'bg-emerald-500',
        };
      case 'Completed':
        return {
          stroke: 'url(#attendanceBlueGradient)',
          bg: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
          dot: 'bg-blue-500',
        };
      case 'Late':
      case 'Very Late':
        return {
          stroke: 'url(#attendanceAmberGradient)',
          bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
          dot: 'bg-amber-500',
        };
      case 'Half Day':
        return {
          stroke: 'url(#attendancePurpleGradient)',
          bg: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
          dot: 'bg-purple-500',
        };
      case 'Break':
        return {
          stroke: 'url(#attendanceYellowGradient)',
          bg: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
          dot: 'bg-yellow-500',
        };
      case 'Absent':
        return {
          stroke: '#ef4444',
          bg: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
          dot: 'bg-rose-500',
        };
      default:
        return {
          stroke: '#94a3b8',
          bg: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
          dot: 'bg-slate-400',
        };
    }
  };

  const statusStyle = getStatusColor(status);

  // Calculate needle angle: from -180deg to 0deg (or 180 to 360)
  const needleAngle = -180 + (clampedPercent * 180) / 100;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {/* 180-Degree SVG Gauge */}
      <div className="relative" style={{ width: size, height: size / 2 + 50 }}>
        <svg width={size} height={size / 2 + 50} viewBox={`0 0 ${size} ${size / 2 + 50}`}>
          <defs>
            <linearGradient id="attendanceGreenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="attendanceBlueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="attendanceAmberGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="attendancePurpleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#7e22ce" />
            </linearGradient>
            <linearGradient id="attendanceYellowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
          </defs>

          {/* Semicircular Background Arc */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Animated Filled Progress Arc */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={statusStyle.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.8s ease-in-out, stroke 0.5s ease',
            }}
          />

          {/* Pivot Indicator */}
          <circle cx={cx} cy={cy} r={7} fill="#1e293b" />
          <circle cx={cx} cy={cy} r={3} fill="#ffffff" />
        </svg>

        {/* Center Percentage Display inside Semicircle */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-end pointer-events-none"
          style={{ bottom: 4 }}
        >
          <span className="text-3xl font-extrabold tracking-tight text-slate-800">
            {Math.round(clampedPercent)}%
          </span>
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 mt-0.5">
            Shift Progress
          </span>
        </div>
      </div>

      {/* Attendance Status Pill */}
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${statusStyle.bg} mt-2 shadow-sm`}
      >
        <span className={`w-2 h-2 rounded-full ${statusStyle.dot} animate-pulse`} />
        {status}
      </div>

      {/* Structured Metric Badges */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-sm mt-4 text-center">
        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Completed</div>
          <div className="text-sm font-bold text-slate-800 mt-0.5">{formatHrsMins(completedMinutes)}</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Required</div>
          <div className="text-sm font-bold text-slate-800 mt-0.5">{formatHrsMins(requiredMinutes)}</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Remaining</div>
          <div className="text-sm font-bold text-slate-800 mt-0.5">{formatHrsMins(remainingMinutes)}</div>
        </div>
      </div>
    </div>
  );
}
