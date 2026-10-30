import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
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
      enum: ['exam_scheduled', 'exam_rescheduled', 'exam_cancelled', 'results_published'],
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
      examTitle: { type: String, required: true },
      subject: { type: String, required: true },
      classGrade: { type: String, required: true },
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
