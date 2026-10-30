import mongoose from 'mongoose';

const attemptAnswerSchema = new mongoose.Schema(
  {
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExaminationAttempt',
      required: true,
      index: true,
    },
    questionId: {
      type: String, // Stringified ID matching the snapshot/question ID
      required: true,
      index: true,
    },
    sectionId: {
      type: String,
      default: 'sec_1',
    },
    questionType: {
      type: String,
      required: true,
    },
    studentAnswer: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    clientSeq: {
      type: Number,
      default: 1,
    },
    clientTimestamp: {
      type: Date,
    },
    serverTimestamp: {
      type: Date,
      default: Date.now,
    },
    isAnswered: {
      type: Boolean,
      default: false,
    },
    isMarkedForReview: {
      type: Boolean,
      default: false,
    },
    visited: {
      type: Boolean,
      default: true,
    },
    // Evaluation metadata
    marksAwarded: {
      type: Number,
      default: 0,
    },
    autoEvaluated: {
      type: Boolean,
      default: false,
    },
    isEvaluated: {
      type: Boolean,
      default: false,
    },
    evaluatorFeedback: {
      type: String,
      default: '',
    },
    evaluationComment: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Compound Unique Index: One answer document per question per attempt
attemptAnswerSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });

const AttemptAnswer = mongoose.model('AttemptAnswer', attemptAnswerSchema);
export default AttemptAnswer;
