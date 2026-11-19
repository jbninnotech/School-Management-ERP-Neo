import mongoose from 'mongoose';

const attendanceCorrectionSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    attendance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance',
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    requestedPunchIn: {
      type: Date,
      required: true,
    },
    requestedPunchOut: {
      type: Date,
      default: null,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    adminComment: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const AttendanceCorrection = mongoose.model('AttendanceCorrection', attendanceCorrectionSchema);
export default AttendanceCorrection;
