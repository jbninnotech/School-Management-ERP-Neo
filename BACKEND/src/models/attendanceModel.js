import mongoose from 'mongoose';

const breakRecordSchema = new mongoose.Schema(
  {
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    durationMinutes: {
      type: Number,
      default: 0,
    },
    reason: {
      type: String,
      default: 'Lunch/Break',
    },
  },
  { _id: true }
);

const locationLogSchema = new mongoose.Schema(
  {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number },
    distanceMeters: { type: Number },
    verified: { type: Boolean, default: false },
    statusMessage: { type: String, default: 'Location Verified' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    schoolId: {
      type: String,
      default: 'SCH-MAIN',
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSchedule',
      required: false,
    },
    scheduledStartTime: {
      type: String, // e.g. "09:00"
      default: '09:00',
    },
    scheduledEndTime: {
      type: String, // e.g. "17:00"
      default: '17:00',
    },
    punchInTime: {
      type: Date,
      default: null,
    },
    punchOutTime: {
      type: Date,
      default: null,
    },
    punchInLocation: {
      type: locationLogSchema,
      default: null,
    },
    punchOutLocation: {
      type: locationLogSchema,
      default: null,
    },
    lateMinutes: {
      type: Number,
      default: 0,
    },
    earlyLogoutMinutes: {
      type: Number,
      default: 0,
    },
    breaks: [breakRecordSchema],
    totalBreakMinutes: {
      type: Number,
      default: 0,
    },
    totalWorkingMinutes: {
      type: Number,
      default: 0, // gross minutes between punch in and punch out
    },
    effectiveWorkingMinutes: {
      type: Number,
      default: 0, // totalWorkingMinutes - totalBreakMinutes
    },
    requiredWorkingMinutes: {
      type: Number,
      default: 480, // from schedule
    },
    overtimeMinutes: {
      type: Number,
      default: 0,
    },
    // Detailed Status: 'Present', 'Working', 'Late', 'Very Late', 'Half Day', 'Completed', 'Absent', 'On Leave', 'Weekly Off', 'Off-Day Worked'
    status: {
      type: String,
      enum: [
        'Present',
        'Working',
        'Late',
        'Very Late',
        'Half Day',
        'Completed',
        'Absent',
        'On Leave',
        'Weekly Off',
        'Off-Day Worked',
      ],
      default: 'Absent',
      index: true,
    },
    isOffDay: {
      type: Boolean,
      default: false,
    },
    isOnBreak: {
      type: Boolean,
      default: false,
    },
    approvalStatus: {
      type: String,
      enum: ['Approved', 'Pending Approval', 'Rejected'],
      default: 'Approved',
    },
    notes: {
      type: String,
      default: '',
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ teacher: 1, date: 1 }, { unique: true });
attendanceSchema.index({ schoolId: 1, date: 1, status: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
