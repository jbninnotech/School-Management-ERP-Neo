import mongoose from 'mongoose';

const questionPaperSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Question paper title is required'],
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      index: true,
    },
    classGrade: {
      type: String,
      required: [true, 'Class / Grade is required'],
      trim: true,
      index: true,
    },
    section: {
      type: String,
      default: 'A',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    schoolId: {
      type: String,
      default: 'SCH-DEFAULT',
      index: true,
    },
    patternId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamPattern',
      default: null,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    durationMinutes: {
      type: Number,
      default: 60,
    },
    status: {
      type: String,
      enum: ['draft', 'ready'],
      default: 'draft',
      index: true,
    },
    questions: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question',
        },
        questionText: { type: String, required: true },
        questionType: { type: String, default: 'single_mcq' },
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
        correctAnswer: {
          type: mongoose.Schema.Types.Mixed,
        },
        explanation: {
          type: String,
          default: '',
        },
      },
    ],
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

questionPaperSchema.index({ createdBy: 1, isArchived: 1, classGrade: 1, subject: 1 });

const QuestionPaper = mongoose.model('QuestionPaper', questionPaperSchema);
export default QuestionPaper;
