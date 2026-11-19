import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    endDate: {
      type: String, // YYYY-MM-DD (optional for ranges)
      default: '',
    },
    type: {
      type: String,
      enum: ['Public Holiday', 'School Holiday', 'Special Working Day', 'Weekly Off Exception'],
      default: 'Public Holiday',
    },
    description: {
      type: String,
      default: '',
    },
    academicYear: {
      type: String,
      default: '2026-2027',
    },
    schoolId: {
      type: String,
      default: 'SCH-MAIN',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

holidaySchema.index({ schoolId: 1, date: 1 }, { unique: true });

const Holiday = mongoose.model('Holiday', holidaySchema);
export default Holiday;
