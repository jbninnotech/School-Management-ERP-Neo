import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    schoolId: {
      type: String,
      default: 'SCH-DEFAULT',
      index: true,
    },
    academicYear: {
      type: String,
      default: '2025-2026',
      index: true,
    },
    classGrade: {
      type: String,
      required: [true, 'Class / Grade is required'],
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      index: true,
    },
    chapter: {
      type: String,
      trim: true,
      default: '',
    },
    topic: {
      type: String,
      trim: true,
      default: '',
    },
    questionType: {
      type: String,
      required: [true, 'Question type is required'],
      enum: [
        'single_mcq',
        'multiple_select',
        'true_false',
        'fill_blanks',
        'one_word',
        'short_answer',
        'long_answer',
        'match_following',
        'image_based',
        'passage_based',
        'numerical',
        'diagram_based',
        'case_study',
        'assertion_reason',
      ],
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
      index: true,
    },
    marks: {
      type: Number,
      required: true,
      default: 1,
      min: 0.5,
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
    },
    instructionText: {
      type: String,
      default: '',
    },
    passageText: {
      type: String,
      default: '', // Used for passage_based and case_study
    },
    imageUrl: {
      type: String,
      default: '', // Used for image_based, diagram_based, or general visual aids
    },
    options: [
      {
        id: { type: String, required: true }, // e.g. "opt_1", "opt_2"
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
    // Correct answer can hold:
    // - string (option id for single_mcq, assertion_reason)
    // - array of strings (for multiple_select or accepted fill_blanks)
    // - boolean (for true_false)
    // - number (for numerical)
    // - array of { left, right } (for match_following)
    // - descriptive guidance / rubric (for short_answer, long_answer, case_study)
    correctAnswer: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    numericalTolerance: {
      type: Number,
      default: 0, // e.g. 0.05
    },
    explanation: {
      type: String,
      default: '',
    },
    tags: [{ type: String, trim: true }],
    estimatedTimeMinutes: {
      type: Number,
      default: 2,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'approved', 'archived'],
      default: 'approved',
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Search indexes
questionSchema.index({
  questionText: 'text',
  chapter: 'text',
  topic: 'text',
  tags: 'text',
});

const Question = mongoose.model('Question', questionSchema);
export default Question;
