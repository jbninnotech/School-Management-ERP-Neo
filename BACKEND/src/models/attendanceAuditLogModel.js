import mongoose from 'mongoose';

const attendanceAuditLogSchema = new mongoose.Schema(
  {
    attendance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance',
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String, // 'PUNCH_IN', 'PUNCH_OUT', 'START_BREAK', 'END_BREAK', 'MANUAL_OVERWRITE', 'CORRECTION_APPROVED', 'CORRECTION_REJECTED'
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const AttendanceAuditLog = mongoose.model('AttendanceAuditLog', attendanceAuditLogSchema);
export default AttendanceAuditLog;
