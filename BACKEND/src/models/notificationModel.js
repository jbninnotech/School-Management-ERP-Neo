import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    link: {
      type: String,
      default: '',
    },
    examination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Examination',
      required: false,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'exam_scheduled',
        'exam_rescheduled',
        'exam_cancelled',
        'exam_starting_soon',
        'exam_now_available',
        'exam_submitted_successfully',
        'results_published',
        'paper_approved',
        'paper_rejected',
        'paper_submitted',
        'exam_review_requested',
        'student_warning_limit',
        'student_offline_alert',
        'exam_ending_soon',
        'teacher_message',
      ],
      default: 'exam_scheduled',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    examMetadata: {
      examTitle: { type: String, default: '' },
      subject: { type: String, default: '' },
      classGrade: { type: String, default: '' },
      sections: { type: [String], default: [] },
      examDate: { type: Date },
      startTime: { type: Date },
      endTime: { type: Date },
      durationMinutes: { type: Number, default: 60 },
      totalMarks: { type: Number, default: 100 },
      status: { type: String, default: 'scheduled' },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound indexes for optimal queries and deduplication
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ examination: 1, recipient: 1, type: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
