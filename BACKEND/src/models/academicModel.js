import mongoose from 'mongoose';

const academicStructureSchema = new mongoose.Schema(
  {
    academicYear: {
      type: String,
      required: true,
      default: '2025-2026',
    },
    classes: [
      {
        name: { type: String, required: true }, // e.g. "Class 10", "LKG"
        code: { type: String },
        level: {
          type: String,
          enum: ['pre_primary', 'primary', 'middle', 'secondary', 'senior_secondary'],
          default: 'secondary',
        },
        sections: [{ type: String, default: ['A', 'B', 'C'] }],
        subjects: [{ type: String }],
      },
    ],
    isDefault: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const AcademicStructure = mongoose.model('AcademicStructure', academicStructureSchema);
export default AcademicStructure;
