import mongoose from 'mongoose';

const examinationSectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true }, // e.g., "Section A - Objective Questions"
    description: { type: String, default: '' },
    durationMinutes: { type: Number, default: 0 }, // 0 means uses overall exam duration
    totalMarks: { type: Number, default: 0 },
    questions: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question',
        },
        questionText: { type: String, required: true },
        questionType: { type: String, required: true },
        difficulty: { type: String, default: 'medium' },
        chapter: { type: String, default: '' },
        topic: { type: String, default: '' },
        marks: { type: Number, required: true, default: 1 },
        negativeMarks: { type: Number, default: 0 },
        instructionText: { type: String, default: '' },
        passageText: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
        options: [
          {
            id: { type: String },
            text: { type: String },
            imageUrl: { type: String, default: '' },
          },
        ],
        matchPairs: [
          {
            id: { type: String },
            left: { type: String },
            right: { type: String },
          },
        ],
        correctAnswer: {
          type: mongoose.Schema.Types.Mixed,
        },
        numericalTolerance: {
          type: Number,
          default: 0,
        },
        explanation: {
          type: String,
          default: '',
        },
        order: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  { _id: false }
);

const examinationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Examination title is required'],
      trim: true,
    },
    examCode: {
      type: String,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['regular', 'mid_term', 'final', 'unit_test', 'competitive_mock', 'practice', 'olympiad'],
      default: 'unit_test',
    },
    schoolId: {
      type: String,
      default: 'SCH-DEFAULT',
      index: true,
    },
    academicYear: {
      type: String,
      default: '2025-2026',
    },
    classGrade: {
      type: String,
      required: [true, 'Class / Grade is required'],
      index: true,
    },
    sections: {
      type: [String],
      default: ['A'], // Eligible sections e.g., ['A', 'B']
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    instructions: {
      type: String,
      default: 'Read all questions carefully. Verify your answers before final submission.',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Workflow & Approval
    status: {
      type: String,
      enum: [
        'draft',
        'submitted_for_review',
        'approved',
        'rejected',
        'scheduled',
        'published',
        'in_progress',
        'completed',
        'results_published',
        'cancelled',
      ],
      default: 'draft',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewComments: {
      type: String,
      default: '',
    },
    reviewedAt: {
      type: Date,
    },
    version: {
      type: Number,
      default: 1,
    },
    paperVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaperVersion',
      index: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentTemplate',
    },
    gradeBand: {
      type: String,
      enum: ['early_years', 'primary', 'middle', 'secondary', 'senior_secondary'],
      default: 'secondary',
    },
    revision: {
      type: Number,
      default: 1, // Optimistic concurrency revision counter
    },
    isSnapshotLocked: {
      type: Boolean,
      default: false,
    },

    // Schedule
    examDate: {
      type: Date,
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      default: 60,
    },
    availabilityWindowStart: {
      type: Date,
    },
    availabilityWindowEnd: {
      type: Date,
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    lateStartPolicy: {
      type: String,
      enum: [
        'allow_with_reduced_time',
        'allow_with_full_time',
        'disallow_after_15_mins',
        'disallow_after_start',
      ],
      default: 'allow_with_reduced_time',
    },
    autoSubmitAtDeadline: {
      type: Boolean,
      default: true,
    },
    resultPublicationMode: {
      type: String,
      enum: ['manual', 'immediate', 'scheduled'],
      default: 'manual',
    },
    resultPublicationDate: {
      type: Date,
    },

    // Marks & Evaluation
    totalMarks: {
      type: Number,
      required: true,
      default: 100,
    },
    passingMarks: {
      type: Number,
      required: true,
      default: 40,
    },
    negativeMarkingEnabled: {
      type: Boolean,
      default: false,
    },
    defaultNegativeMarks: {
      type: Number,
      default: 0,
    },
    partialMarkingEnabled: {
      type: Boolean,
      default: false,
    },
    evaluationMethod: {
      type: String,
      enum: ['automatic', 'hybrid', 'manual'],
      default: 'hybrid',
    },

    // Rules & Competitive Engine
    questionNavigation: {
      type: String,
      enum: ['free', 'linear'],
      default: 'free',
    },
    allowPreviousNavigation: {
      type: Boolean,
      default: true,
    },
    randomizeQuestionOrder: {
      type: Boolean,
      default: false,
    },
    randomizeOptionOrder: {
      type: Boolean,
      default: false,
    },
    questionsPerPage: {
      type: Number,
      default: 1,
    },
    sectionNavigation: {
      type: String,
      enum: ['flexible', 'sequential'],
      default: 'flexible',
    },
    sectionTimeLimitsEnabled: {
      type: Boolean,
      default: false,
    },
    calculatorAllowed: {
      type: Boolean,
      default: false,
    },
    reviewBeforeSubmit: {
      type: Boolean,
      default: true,
    },
    maxAttempts: {
      type: Number,
      default: 1,
    },
    isPracticeMode: {
      type: Boolean,
      default: false,
    },
    showResultsImmediately: {
      type: Boolean,
      default: false,
    },
    showFeedback: {
      type: Boolean,
      default: false,
    },
    fullScreenWarningEnabled: {
      type: Boolean,
      default: true,
    },
    tabSwitchLimit: {
      type: Number,
      default: 3,
    },

    // Sections & Questions
    examSections: [examinationSectionSchema],

    // Blueprint configuration
    blueprint: {
      totalQuestions: { type: Number, default: 0 },
      easyPercentage: { type: Number, default: 20 },
      mediumPercentage: { type: Number, default: 50 },
      hardPercentage: { type: Number, default: 30 },
      topicDistribution: [
        {
          topic: { type: String },
          questionCount: { type: Number },
        },
      ],
    },
  },
  { timestamps: true }
);

// Auto-generate Exam Code if not present
examinationSchema.pre('validate', function () {
  if (!this.examCode) {
    const year = new Date().getFullYear();
    const cleanSubject = (this.subject || 'GEN').substring(0, 3).toUpperCase();
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.examCode = `EXM-${cleanSubject}-${year}-${rand}`;
  }
});

const Examination = mongoose.model('Examination', examinationSchema);
export default Examination;
