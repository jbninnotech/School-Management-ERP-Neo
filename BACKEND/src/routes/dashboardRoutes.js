import { Router } from 'express';
import {
  getAdminDashboardStats,
  getTeacherDashboardStats,
  getStudentDashboardStats,
} from '../controllers/dashboardController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

// Route: GET /api/v1/dashboard/admin
router.get('/admin', protect, authorize('superadmin', 'admin'), getAdminDashboardStats);

// Route: GET /api/v1/dashboard/teacher
router.get('/teacher', protect, authorize('superadmin', 'admin', 'teacher'), getTeacherDashboardStats);

// Route: GET /api/v1/dashboard/student
router.get('/student', protect, authorize('student'), getStudentDashboardStats);

export default router;
