import mongoose from 'mongoose';

const substitutionSchema = new mongoose.Schema(
  {
    schoolId: {
      type: String,
      default: 'SCH-MAIN',
      index: true,
    },
    leave: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Leave',
      required: true,
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    periodNo: {
      type: Number,
      required: true,
    },
    startTime: {
      type: String,
      default: '',
    },
    endTime: {
      type: String,
      default: '',
    },
    classGrade: {
      type: String,
      required: true,
    },
    section: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    originalTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    proposedSubstitute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    substituteTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    status: {
      type: String,
      enum: ['Unassigned', 'Proposed', 'Assigned', 'Accepted', 'Rejected', 'Expired', 'Cancelled'],
      default: 'Unassigned',
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    respondedAt: {
      type: Date,
    },
    rejectReason: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Prevent same substitute teacher double-booking on same date + period
substitutionSchema.index(
  { substituteTeacher: 1, date: 1, periodNo: 1, status: 1 }
);

const Substitution = mongoose.model('Substitution', substitutionSchema);
export default Substitution;
