import mongoose from 'mongoose';

/**
 * 4-Level Category Model:
 * Hierarchy: Subject > Unit > Topic > Sub-topic > Child topic
 * Levels: 'unit', 'topic', 'subtopic', 'child'
 */
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    level: {
      type: String,
      required: [true, 'Category level is required'],
      enum: ['unit', 'topic', 'subtopic', 'child'],
      index: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
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
    // Array of ancestor ids [unitId, topicId, subTopicId]
    path: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    order: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index on subject, classGrade, parentId for fast cascading queries & duplicate checking
categorySchema.index({ subject: 1, classGrade: 1, parentId: 1, isDeleted: 1 });

// Text index on name for fast search
categorySchema.index({ name: 'text' });

const Category = mongoose.model('Category', categorySchema);
export default Category;
