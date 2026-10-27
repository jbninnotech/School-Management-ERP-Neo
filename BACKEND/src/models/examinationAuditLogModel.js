import mongoose from 'mongoose';

const examinationAuditLogSchema = new mongoose.Schema(
  {
    examination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Examination',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'EXAM_CREATED',
        'EXAM_UPDATED',
        'PAPER_SUBMITTED_REVIEW',
        'PAPER_APPROVED',
        'PAPER_REJECTED',
        'EXAM_SCHEDULED',
        'ATTEMPT_STARTED',
        'ANSWER_SAVED',
        'TAB_SWITCH_RECORDED',
        'EXAM_SUBMITTED',
        'AUTO_EVALUATED',
        'MANUAL_EVALUATION_SAVED',
        'RESULTS_PUBLISHED',
        'RESULTS_UNPUBLISHED',
      ],
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

const ExaminationAuditLog = mongoose.model('ExaminationAuditLog', examinationAuditLogSchema);
export default ExaminationAuditLog;
