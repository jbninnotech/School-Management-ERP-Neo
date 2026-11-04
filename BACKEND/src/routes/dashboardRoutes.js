import { Router } from 'express';
import {
  getAdminDashboardStats,
  getTeacherDashboardStats,
  getStudentDashboardStats,
} from '../controllers/dashboardController.js';
import {
  getAdminAnalyticsReport,
  getStudentPerformanceReport,
} from '../controllers/analyticsController.js';
import { getChapterTopicAnalysis } from '../controllers/topicAnalysisController.js';
import { downloadStudentReportPdf } from '../controllers/pdfReportController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

// Route: GET /api/v1/dashboard/admin
router.get('/admin', protect, authorize('superadmin', 'admin'), getAdminDashboardStats);
router.get('/admin/analytics', protect, authorize('superadmin', 'admin'), getAdminAnalyticsReport);

// Chapter and Topic Drill-Down Analysis
router.get('/topic-analysis', protect, getChapterTopicAnalysis);

// Route: GET /api/v1/dashboard/teacher
router.get('/teacher', protect, authorize('superadmin', 'admin', 'teacher'), getTeacherDashboardStats);

// Route: GET /api/v1/dashboard/student
router.get('/student', protect, authorize('student'), getStudentDashboardStats);
router.get('/student/report', protect, authorize('student'), getStudentPerformanceReport);
router.get('/student/report/pdf', protect, authorize('student'), downloadStudentReportPdf);
router.get('/student/:studentId/report', protect, authorize('superadmin', 'admin', 'teacher', 'student'), getStudentPerformanceReport);
router.get('/student/:studentId/report/pdf', protect, authorize('superadmin', 'admin', 'teacher', 'student'), downloadStudentReportPdf);

export default router;
