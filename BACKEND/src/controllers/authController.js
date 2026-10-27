import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Role-Based Login
// @route   POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const query = { email };
    if (role) query.role = role;

    const user = await User.findOne(query).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or role' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated' });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        _id: user._id,
        schoolId: user.schoolId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePhoto: user.profilePhoto,
        teacherProfile: user.teacherProfile,
        studentProfile: user.studentProfile,
        profile: user.role === 'teacher' ? user.teacherProfile : user.role === 'student' ? user.studentProfile : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    One-Time SuperAdmin Setup
// @route   POST /api/auth/setup-superadmin
export const setupSuperAdmin = async (req, res, next) => {
  try {
    const exists = await User.findOne({ role: 'superadmin' });
    if (exists) {
      return res.status(400).json({ success: false, message: 'SuperAdmin already exists' });
    }

    const { name, email, password, phone } = req.body;
    const superAdmin = await User.create({
      name,
      email,
      password,
      phone,
      role: 'superadmin',
    });

    res.status(201).json({
      success: true,
      message: 'SuperAdmin created successfully',
      data: {
        id: superAdmin._id,
        schoolId: superAdmin.schoolId,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add Teacher (SuperAdmin & Admin)
// @route   POST /api/auth/add-teacher
export const addTeacher = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      gender,
      dob,
      currentAddress,
      emergencyContact,
      employeeId,
      subject,
      qualification,
      assignedClasses,
      assignedSections,
      assignedSubjects,
    } = req.body;

    // 1. Check if email already exists
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email is already registered' });
    }

    // 2. Cloudinary returns HTTPS image URL in req.file.path
    const profilePhotoUrl = req.file
      ? req.file.path
      : 'https://res.cloudinary.com/demo/image/upload/v1/avatar.png';

    // Parse arrays if received as JSON string from multipart/form-data
    let parsedClasses = [];
    let parsedSections = [];
    let parsedSubjects = [];
    try {
      parsedClasses = Array.isArray(assignedClasses) ? assignedClasses : assignedClasses ? JSON.parse(assignedClasses) : [];
      parsedSections = Array.isArray(assignedSections) ? assignedSections : assignedSections ? JSON.parse(assignedSections) : [];
      parsedSubjects = Array.isArray(assignedSubjects) ? assignedSubjects : assignedSubjects ? JSON.parse(assignedSubjects) : [];
    } catch {
      parsedClasses = assignedClasses ? [assignedClasses] : [];
    }

    // 3. Create the Teacher record
    const teacher = await User.create({
      name,
      email,
      phone,
      password: password || 'Teacher@2026', // default fallback password
      role: 'teacher',
      profilePhoto: profilePhotoUrl,
      gender: gender || '',
      dob: dob ? new Date(dob) : undefined,
      currentAddress: currentAddress || '',
      emergencyContact: emergencyContact || '',
      createdBy: req.user._id,
      teacherProfile: {
        employeeId: employeeId || '',
        subject: subject || '',
        qualification: qualification || '',
        assignedClasses: parsedClasses,
        assignedSections: parsedSections,
        assignedSubjects: parsedSubjects.length ? parsedSubjects : (subject ? [subject] : []),
      },
    });

    // 4. Send response including auto-generated School ID
    res.status(201).json({
      success: true,
      message: 'Teacher added successfully',
      data: {
        id: teacher._id,
        _id: teacher._id,
        schoolId: teacher.schoolId,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        role: teacher.role,
        profilePhoto: teacher.profilePhoto,
        gender: teacher.gender,
        dob: teacher.dob,
        currentAddress: teacher.currentAddress,
        emergencyContact: teacher.emergencyContact,
        teacherProfile: teacher.teacherProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add Student (SuperAdmin, Admin, & Teacher)
// @route   POST /api/auth/add-student
export const addStudent = async (req, res, next) => {
  try {
    const { name, email, password, phone, rollNumber, classGrade, section, parentName, parentPhone } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email is already registered' });
    }

    const student = await User.create({
      name,
      email,
      password: password || 'Student@2026',
      phone: phone || '+91 9999999999',
      role: 'student',
      createdBy: req.user._id,
      studentProfile: {
        rollNumber: rollNumber || '',
        classGrade: classGrade || 'Class 10',
        section: section || 'A',
        parentName: parentName || '',
        parentPhone: parentPhone || '',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      data: {
        id: student._id,
        _id: student._id,
        schoolId: student.schoolId,
        name: student.name,
        email: student.email,
        role: student.role,
        profile: student.studentProfile,
        studentProfile: student.studentProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Teachers
// @route   GET /api/auth/teachers
export const getTeachers = async (req, res, next) => {
  try {
    const teachers = await User.find({ role: 'teacher' }).select('-password').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: teachers.length,
      data: teachers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Students
// @route   GET /api/auth/students
export const getStudents = async (req, res, next) => {
  try {
    const { classGrade, section } = req.query;
    const filter = { role: 'student' };
    if (classGrade) filter['studentProfile.classGrade'] = classGrade;
    if (section) filter['studentProfile.section'] = section;

    const students = await User.find(filter).select('-password').sort({ 'studentProfile.rollNumber': 1, name: 1 });
    res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Current Logged in User Profile
// @route   GET /api/auth/me
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign Teacher Classes & Subjects
// @route   PUT /api/auth/assign-teacher/:id
export const assignTeacherClasses = async (req, res, next) => {
  try {
    const { assignedClasses, assignedSections, assignedSubjects } = req.body;
    const teacher = await User.findById(req.params.id);

    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    teacher.teacherProfile.assignedClasses = assignedClasses || teacher.teacherProfile.assignedClasses;
    teacher.teacherProfile.assignedSections = assignedSections || teacher.teacherProfile.assignedSections;
    teacher.teacherProfile.assignedSubjects = assignedSubjects || teacher.teacherProfile.assignedSubjects;

    await teacher.save();

    res.status(200).json({
      success: true,
      message: 'Teacher assignments updated successfully',
      data: teacher,
    });
  } catch (error) {
    next(error);
  }
};
