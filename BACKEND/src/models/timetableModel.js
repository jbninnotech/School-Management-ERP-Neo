import mongoose from 'mongoose';

const timetableSchema = new mongoose.Schema(
  {
    schoolId: {
      type: String,
      default: 'SCH-MAIN',
      index: true,
    },
    academicYear: {
      type: String,
      default: '2025-2026',
      required: true,
    },
    classGrade: {
      type: String,
      required: true,
      index: true,
    },
    section: {
      type: String,
      required: true,
      index: true,
    },
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      required: true,
      index: true,
    },
    periodNo: {
      type: Number,
      required: true,
    },
    startTime: {
      type: String,
      required: true, // e.g. "09:00 AM"
    },
    endTime: {
      type: String,
      required: true, // e.g. "09:45 AM"
    },
    subject: {
      type: String,
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    room: {
      type: String,
      default: 'Room 101',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Unique compound index: class + section + day + period in an academic year
timetableSchema.index(
  { academicYear: 1, classGrade: 1, section: 1, dayOfWeek: 1, periodNo: 1 },
  { unique: true }
);

// Prevent same teacher in two classes in same dayOfWeek + periodNo
timetableSchema.index(
  { academicYear: 1, teacher: 1, dayOfWeek: 1, periodNo: 1 },
  { unique: true }
);

const Timetable = mongoose.model('Timetable', timetableSchema);
export default Timetable;
