import mongoose from 'mongoose';

const examPatternSectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Section name is required'],
      trim: true,
    },
    questionType: {
      type: String,
      required: [true, 'Question type is required'],
    },
    numberOfQuestions: {
      type: Number,
      required: [true, 'Number of questions is required'],
      min: 1,
    },
    marksPerQuestion: {
      type: Number,
      required: [true, 'Marks per question is required'],
      min: 0.5,
    },
    negativeMarksPerQuestion: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const examPatternSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Pattern name is required'],
      trim: true,
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
    totalMarks: {
      type: Number,
      required: [true, 'Total marks is required'],
      min: 1,
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: 5,
    },
    sections: {
      type: [examPatternSectionSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Exam pattern must have at least one section',
      },
    },
    negativeMarking: {
      type: Boolean,
      default: false,
    },
    difficultyDistribution: {
      easy: { type: Number, default: 30 },
      medium: { type: Number, default: 50 },
      hard: { type: Number, default: 20 },
    },
    passingMarks: {
      type: Number,
      required: [true, 'Passing marks is required'],
      min: 0,
    },
    maxWarnings: {
      type: Number,
      default: 3,
    },
    instructions: {
      type: String,
      default: '',
    },
    assignedTeachers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'active',
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Auto-validate passing marks <= totalMarks
examPatternSchema.pre('validate', function () {
  if (this.passingMarks > this.totalMarks) {
    this.invalidate('passingMarks', 'Passing marks cannot exceed total marks');
  }
});

const ExamPattern = mongoose.model('ExamPattern', examPatternSchema);
export default ExamPattern;
