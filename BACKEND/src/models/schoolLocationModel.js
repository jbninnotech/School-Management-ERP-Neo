import mongoose from 'mongoose';

const schoolLocationSchema = new mongoose.Schema(
  {
    schoolName: {
      type: String,
      default: 'Main Campus',
      trim: true,
    },
    schoolId: {
      type: String,
      default: 'SCH-MAIN',
      unique: true,
      index: true,
    },
    latitude: {
      type: Number,
      required: true,
      default: 28.6139, // Default sample coordinates (e.g. New Delhi / school area)
    },
    longitude: {
      type: Number,
      required: true,
      default: 77.209,
    },
    radiusMeters: {
      type: Number,
      required: true,
      default: 50, // Permitted 50-meter radius
    },
    maxAccuracyMeters: {
      type: Number,
      default: 100, // Reject GPS if device reporting accuracy worse than 100m
    },
    strictGeofence: {
      type: Boolean,
      default: true,
    },
    address: {
      type: String,
      default: 'School Campus Main Gate',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

const SchoolLocation = mongoose.model('SchoolLocation', schoolLocationSchema);
export default SchoolLocation;
