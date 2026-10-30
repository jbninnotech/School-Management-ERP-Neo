import mongoose from 'mongoose';

const assessmentTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    gradeBand: {
      type: String,
      enum: ['early_years', 'primary', 'middle', 'secondary', 'senior_secondary'],
      required: true,
      index: true,
    },
    applicableClasses: [{ type: String, trim: true }],
    description: {
      type: String,
      default: '',
    },
    allowedQuestionTypes: [
      {
        type: String,
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
          'oral_observational',
        ],
      },
    ],
    allowedDifficultyLevels: [
      {
        type: String,
        enum: ['easy', 'medium', 'hard', 'advanced', 'olympiad'],
      },
    ],
    allowNegativeMarking: {
      type: Boolean,
      default: false,
    },
    allowCalculator: {
      type: Boolean,
      default: false,
    },
    maxDurationMinutes: {
      type: Number,
      default: 180,
    },
    defaultNavigationMode: {
      type: String,
      enum: ['free', 'linear'],
      default: 'free',
    },
    gradingType: {
      type: String,
      enum: ['marks_percentage', 'descriptive_levels'], // descriptive_levels: Beginner / Developing / Secure
      default: 'marks_percentage',
    },
    descriptiveLevels: [
      {
        level: { type: String }, // e.g. "Beginner", "Developing", "Secure"
        description: { type: String },
        minScorePercent: { type: Number },
      },
    ],
    uiMode: {
      type: String,
      enum: ['early_years_cards', 'primary_simplified', 'standard_board', 'senior_competitive'],
      default: 'standard_board',
    },
    isSystemDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const AssessmentTemplate = mongoose.model('AssessmentTemplate', assessmentTemplateSchema);
export default AssessmentTemplate;
