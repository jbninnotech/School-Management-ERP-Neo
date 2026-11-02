import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    schoolId: {
      type: String,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['superadmin', 'principal', 'admin', 'teacher', 'student'],
      default: 'teacher',
    },
    profilePhoto: {
      type: String,
      default: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.png',
    },
    photoPublicId: {
      type: String,
      default: '',
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', ''],
      default: '',
    },
    dob: {
      type: Date,
    },
    currentAddress: {
      type: String,
      trim: true,
    },
    emergencyContact: {
      type: String,
      trim: true,
    },
    teacherProfile: {
      employeeId: { type: String, default: '' },
      subject: { type: String, default: '' },
      qualification: { type: String, default: '' },
      assignedClasses: { type: [String], default: [] },
      assignedSections: { type: [String], default: [] },
      assignedSubjects: { type: [String], default: [] },
    },
    studentProfile: {
      rollNumber: { type: String, default: '' },
      classGrade: { type: String, default: '' },
      section: { type: String, default: '' },
      parentName: { type: String, default: '' },
      parentPhone: { type: String, default: '' },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Auto-generate School ID
userSchema.pre('validate', function () {
  if (!this.schoolId) {
    const year = new Date().getFullYear();
    let prefix = 'STU';
    if (this.role === 'teacher') prefix = 'TEA';
    else if (this.role === 'admin') prefix = 'ADM';
    else if (this.role === 'principal') prefix = 'PRI';
    else if (this.role === 'superadmin') prefix = 'SUA';
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    this.schoolId = `SCH-${prefix}-${year}-${randomDigits}`;
  }
});

// Password Hashing
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Helper for checking password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
