import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema(
  {
    schoolId: {
      type: String,
      default: 'SCH-MAIN',
      index: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    applicantRole: {
      type: String,
      enum: ['teacher', 'student'],
      required: true,
      index: true,
    },
    classGrade: {
      type: String,
      default: '',
    },
    section: {
      type: String,
      default: '',
    },
    leaveType: {
      type: String,
      enum: ['Sick', 'Casual', 'Emergency', 'Other'],
      default: 'Casual',
      required: true,
    },
    fromDate: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    toDate: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    totalDays: {
      type: Number,
      required: true,
      default: 1,
    },
    reason: {
      type: String,
      required: [true, 'Leave reason is required'],
      trim: true,
    },
    attachment: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: [
        'Pending',
        'Teacher_Approved',
        'Teacher_Rejected',
        'Admin_Approved',
        'Admin_Rejected',
        'Cancelled',
      ],
      default: 'Pending',
      index: true,
    },
    // Teacher action (for students)
    teacherRemark: { type: String, default: '' },
    teacherActionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    teacherActionAt: { type: Date },

    // Admin action (final approval or override)
    adminRemark: { type: String, default: '' },
    adminActionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminActionAt: { type: Date },

    // Substitution status
    substitutionStatus: {
      type: String,
      enum: ['NotRequired', 'Pending', 'PartiallyCovered', 'FullyCovered'],
      default: 'NotRequired',
    },
    impactedPeriodsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Prevent active overlapping leaves for the same applicant
leaveSchema.index({ applicant: 1, fromDate: 1, toDate: 1, status: 1 });

const Leave = mongoose.model('Leave', leaveSchema);
export default Leave;
