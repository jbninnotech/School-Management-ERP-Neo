import mongoose from 'mongoose';

const attendanceScheduleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    schoolId: {
      type: String,
      default: 'SCH-MAIN',
      index: true,
    },
    workingDays: {
      type: [String],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    startTime: {
      type: String, // HH:mm format e.g. "09:00"
      required: true,
      default: '09:00',
    },
    endTime: {
      type: String, // HH:mm format e.g. "17:00"
      required: true,
      default: '17:00',
    },
    gracePeriodMinutes: {
      type: Number,
      default: 10,
    },
    lateThresholdMinutes: {
      type: Number,
      default: 30, // after 30 mins marked as Very Late
    },
    halfDayThresholdMinutes: {
      type: Number,
      default: 240, // 4 hours minimum to count as Half Day
    },
    fullDayThresholdMinutes: {
      type: Number,
      default: 420, // 7 hours minimum to count as Full Day
    },
    requiredWorkingMinutes: {
      type: Number,
      default: 480, // 8 hours
    },
    breakDurationMinutes: {
      type: Number,
      default: 30,
    },
    allowOvertime: {
      type: Boolean,
      default: true,
    },
    punchInWindowStart: {
      type: String, // HH:mm e.g. "07:30"
      default: '07:30',
    },
    punchInWindowEnd: {
      type: String, // HH:mm e.g. "12:00"
      default: '12:00',
    },
    punchOutWindowStart: {
      type: String, // HH:mm e.g. "12:01"
      default: '12:01',
    },
    punchOutWindowEnd: {
      type: String, // HH:mm e.g. "22:00"
      default: '22:00',
    },
    requireLocationVerification: {
      type: Boolean,
      default: true,
    },
    applicableTo: {
      type: String,
      enum: ['all', 'department', 'designation', 'individual'],
      default: 'all',
    },
    targetDepartment: {
      type: String,
      default: '',
    },
    targetDesignation: {
      type: String,
      default: '',
    },
    targetTeachers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

attendanceScheduleSchema.index({ schoolId: 1, isActive: 1 });

const AttendanceSchedule = mongoose.model('AttendanceSchedule', attendanceScheduleSchema);
export default AttendanceSchedule;
