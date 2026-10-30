import mongoose from 'mongoose';

const studentAnswerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    sectionId: { type: String, required: true },
    questionType: { type: String, required: true },
    studentAnswer: { type: mongoose.Schema.Types.Mixed, default: null },
    isAnswered: { type: Boolean, default: false },
    isMarkedForReview: { type: Boolean, default: false },
    visited: { type: Boolean, default: false },
    lastSavedAt: { type: Date, default: Date.now },
    marksAwarded: { type: Number, default: 0 },
    autoEvaluated: { type: Boolean, default: false },
    evaluatorFeedback: { type: String, default: '' },
    evaluationComment: { type: String, default: '' },
    isEvaluated: { type: Boolean, default: false },
  },
  { _id: false }
);

const examinationAttemptSchema = new mongoose.Schema(
  {
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
    attemptNumber: {
      type: Number,
      default: 1,
    },
    examVersion: {
      type: Number,
      default: 1,
    },
    paperVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaperVersion',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    deadline: {
      type: Date,
      required: true, // Authoritative server timestamp deadline
    },
    lastHeartbeatAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isExcused: {
      type: Boolean,
      default: false,
    },
    excusedReason: {
      type: String,
      default: '',
    },
    extensionMinutesGranted: {
      type: Number,
      default: 0,
    },
    idempotencyKey: {
      type: String,
      index: true,
    },
    submittedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: [
        'not_started',
        'in_progress',
        'disconnected',
        'submitted',
        'auto_submitted',
        'absent',
        'excused',
        'evaluation_pending',
        'evaluated',
        'result_published',
      ],
      default: 'in_progress',
      index: true,
    },
    submissionType: {
      type: String,
      enum: ['manual', 'auto_timeout', 'admin_forced'],
      default: 'manual',
    },
    answers: [studentAnswerSchema],
    tabSwitchesCount: {
      type: Number,
      default: 0,
    },
    tabSwitchLogs: [
      {
        timestamp: { type: Date, default: Date.now },
        reason: { type: String, default: 'Tab focus change detected' },
      },
    ],
    score: {
      totalScore: { type: Number, default: 0 },
      autoScore: { type: Number, default: 0 },
      manualScore: { type: Number, default: 0 },
      maxMarks: { type: Number, default: 100 },
      percentage: { type: Number, default: 0 },
      isPassed: { type: Boolean, default: false },
      sectionWiseScores: [
        {
          sectionId: { type: String },
          title: { type: String },
          marksObtained: { type: Number },
          maxMarks: { type: Number },
        },
      ],
    },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    evaluatedAt: {
      type: Date,
    },
    evaluationNotes: {
      type: String,
      default: '',
    },
    isResultPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    resultPublishedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness per student & attempt
examinationAttemptSchema.index({ student: 1, examination: 1, attemptNumber: 1 });

const ExaminationAttempt = mongoose.model('ExaminationAttempt', examinationAttemptSchema);
export default ExaminationAttempt;
