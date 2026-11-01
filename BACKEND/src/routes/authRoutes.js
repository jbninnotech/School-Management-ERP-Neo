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

// Faculty / Teachers Directory
router.get('/teachers', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), getTeachers);
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

// Students Directory
router.get('/students', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), getStudents);
router.post(
  '/add-student',
  protect,
  authorize('superadmin', 'admin', 'teacher'),
  addStudent
);

export default router;
