import { Router } from 'express';
import {
  login,
  setupSuperAdmin,
  addTeacher,
  addStudent,
  getTeachers,
  getStudents,
  getCurrentUser,
  assignTeacherClasses,
  updateTeacher,
  deleteTeacher,
  restoreTeacher,
  updateStudent,
  deleteStudent,
  restoreStudent,
  getTeacherQuestionBank,
  getStudentQuestionPerformance,
} from '../controllers/authController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { upload } from '../config/cloudinary.js';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/setup-superadmin', setupSuperAdmin);

// Current user profile
router.get('/me', protect, getCurrentUser);

// Faculty / Teachers Directory
router.get('/teachers', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), getTeachers);
router.post(
  '/add-teacher',
  protect,
  authorize('superadmin', 'admin'),
  upload.single('profilePhoto'),
  addTeacher
);
router.put('/teachers/:id', protect, authorize('superadmin', 'admin'), updateTeacher);
router.delete('/teachers/:id', protect, authorize('superadmin', 'admin'), deleteTeacher);
router.put('/teachers/:id/restore', protect, authorize('superadmin', 'admin'), restoreTeacher);
router.get('/teachers/:id/question-bank', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), getTeacherQuestionBank);

router.put(
  '/assign-teacher/:id',
  protect,
  authorize('superadmin', 'admin'),
  assignTeacherClasses
);

// Students Directory
router.get('/students', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), getStudents);
router.post(
  '/add-student',
  protect,
  authorize('superadmin', 'admin', 'teacher'),
  addStudent
);
router.put('/students/:id', protect, authorize('superadmin', 'admin', 'teacher'), updateStudent);
router.delete('/students/:id', protect, authorize('superadmin', 'admin'), deleteStudent);
router.put('/students/:id/restore', protect, authorize('superadmin', 'admin'), restoreStudent);
router.get('/students/:id/question-performance', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), getStudentQuestionPerformance);

export default router;
