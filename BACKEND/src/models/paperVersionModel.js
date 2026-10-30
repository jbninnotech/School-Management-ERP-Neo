import mongoose from 'mongoose';

const snapshottedQuestionSchema = new mongoose.Schema(
  {
    sourceQuestionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
    },
    sourceQuestionVersion: {
      type: Number,
      default: 1,
    },
    questionText: { type: String, required: true },
    questionType: { type: String, required: true },
    difficulty: { type: String, default: 'medium' },
    chapter: { type: String, default: '' },
    topic: { type: String, default: '' },
    marks: { type: Number, required: true, default: 1 },
    negativeMarks: { type: Number, default: 0 },
    partialMarkingRule: { type: String, default: 'none' }, // none, proportional, custom
    instructionText: { type: String, default: '' },
    passageText: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    options: [
      {
        id: { type: String, required: true },
        text: { type: String, required: true },
        imageUrl: { type: String, default: '' },
      },
    ],
    matchPairs: [
      {
        id: { type: String },
        left: { type: String, required: true },
        right: { type: String, required: true },
      },
    ],
    correctAnswer: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    numericalTolerance: {
      type: Number,
      default: 0,
    },
    rubric: {
      type: String,
      default: '',
    },
    explanation: {
      type: String,
      default: '',
    },
    order: {
      type: Number,
      default: 0,
    },
    internalChoiceGroup: {
      type: String,
      default: '', // If question is part of an OR choice pair
    },
  },
  { _id: true }
);

const paperSectionSnapshotSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    durationMinutes: { type: Number, default: 0 },
    totalMarks: { type: Number, required: true, default: 0 },
    instructions: { type: String, default: '' },
    allowedQuestionTypes: [{ type: String }],
    questions: [snapshottedQuestionSchema],
  },
  { _id: false }
);

const paperVersionSchema = new mongoose.Schema(
  {
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Examination',
      required: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    setName: {
      type: String,
      default: 'Set A', // Set A / Set B / Set C
    },
    title: {
      type: String,
      required: true,
    },
    academicYear: {
      type: String,
      default: '2025-2026',
    },
    classGrade: {
      type: String,
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      index: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentTemplate',
    },
    gradeBand: {
      type: String,
      default: 'secondary',
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    passingMarks: {
      type: Number,
      required: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
    },
    sections: [paperSectionSnapshotSchema],
    totalQuestions: {
      type: Number,
      required: true,
      default: 0,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    checksum: {
      type: String,
      default: '',
    },
    changeNotes: {
      type: String,
      default: 'Initial published version',
    },
    isSealed: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound index for unique version per paper and set
paperVersionSchema.index({ paperId: 1, versionNumber: 1, setName: 1 }, { unique: true });

// IMMUTABILITY ENFORCEMENT: Reject any update to an already-sealed PaperVersion
paperVersionSchema.pre('save', function () {
  if (!this.isNew && this.isSealed) {
    const modified = this.modifiedPaths();
    // Only allow unsealing if explicitly authorized or deny all edits
    if (modified.length > 0 && !modified.includes('isSealed')) {
      throw new Error('IMMUTABLE_RECORD: Published PaperVersion is sealed and cannot be modified. Create a new version instead.');
    }
  }
});

paperVersionSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function () {
  throw new Error('IMMUTABLE_RECORD: Direct updates to PaperVersion documents are forbidden.');
});

const PaperVersion = mongoose.model('PaperVersion', paperVersionSchema);
export default PaperVersion;
