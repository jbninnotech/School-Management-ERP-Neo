import mongoose from 'mongoose';

const violationLogSchema = new mongoose.Schema(
  {
    attempt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExaminationAttempt',
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    examination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Examination',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'tab_switch',
        'window_blur',
        'fullscreen_exit',
        'copy_paste_attempt',
        'right_click_attempt',
        'devtools_open',
        'camera_stopped',
        'location_revoked',
        'away_from_exam',
        'other',
      ],
    },
    reason: {
      type: String,
      default: '',
    },
    warningNumber: {
      type: Number,
      required: true,
    },
    maxWarnings: {
      type: Number,
      default: 3,
    },
    deviceInfo: {
      userAgent: { type: String, default: '' },
      screenResolution: { type: String, default: '' },
      platform: { type: String, default: '' },
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

violationLogSchema.index({ attempt: 1, timestamp: -1 });
violationLogSchema.index({ examination: 1, timestamp: -1 });

const ViolationLog = mongoose.model('ViolationLog', violationLogSchema);
export default ViolationLog;
