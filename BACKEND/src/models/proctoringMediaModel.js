import mongoose from 'mongoose';

const proctoringMediaSchema = new mongoose.Schema(
  {
    examination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Examination',
      required: true,
      index: true,
    },
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
    mediaType: {
      type: String,
      enum: ['snapshot', 'video_chunk'],
      required: true,
      index: true,
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    chunkIndex: {
      type: Number,
      default: 0,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: 'image/jpeg',
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

proctoringMediaSchema.index({ examination: 1, attempt: 1, timestamp: -1 });

const ProctoringMedia = mongoose.model('ProctoringMedia', proctoringMediaSchema);
export default ProctoringMedia;
