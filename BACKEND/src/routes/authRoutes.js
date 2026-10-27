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
} from '../controllers/authController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { upload } from '../config/cloudinary.js';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/setup-superadmin', setupSuperAdmin);

// Current user profile
router.get('/me', protect, getCurrentUser);

// Faculty / Teachers
router.get('/teachers', protect, getTeachers);
router.post(
  '/add-teacher',
  protect,
  authorize('superadmin', 'admin'),
  upload.single('profilePhoto'),
  addTeacher
);
router.put(
  '/assign-teacher/:id',
  protect,
  authorize('superadmin', 'admin'),
  assignTeacherClasses
);

// Students
router.get('/students', protect, getStudents);
router.post(
  '/add-student',
  protect,
  authorize('superadmin', 'admin', 'teacher'),
  addStudent
);

export default router;
