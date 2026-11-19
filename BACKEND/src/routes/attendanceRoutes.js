import { Router } from 'express';
import {
  punchIn,
  punchOut,
  toggleBreak,
  getMyAttendance,
  getMyHistory,
  requestCorrection,
  getAdminDashboard,
  getAttendanceReports,
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getSchoolLocation,
  updateSchoolLocation,
  getHolidays,
  createHoliday,
  deleteHoliday,
  getCorrections,
  reviewCorrection,
} from '../controllers/attendanceController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

// All routes require authentication
router.use(protect);

// ─── TEACHER ROUTES ────────────────────────────────────────────────────────
router.post('/punch-in', authorize('teacher', 'superadmin', 'admin', 'principal'), punchIn);
router.post('/punch-out', authorize('teacher', 'superadmin', 'admin', 'principal'), punchOut);
router.post('/break', authorize('teacher', 'superadmin', 'admin', 'principal'), toggleBreak);
router.get('/my-attendance', authorize('teacher', 'superadmin', 'admin', 'principal'), getMyAttendance);
router.get('/my-history', authorize('teacher', 'superadmin', 'admin', 'principal'), getMyHistory);
router.post('/correction-request', authorize('teacher', 'superadmin', 'admin', 'principal'), requestCorrection);

// ─── ADMIN / PRINCIPAL / SUPERADMIN ROUTES ─────────────────────────────────
router.get('/dashboard', authorize('superadmin', 'admin', 'principal'), getAdminDashboard);
router.get('/reports', authorize('superadmin', 'admin', 'principal'), getAttendanceReports);

// Schedule Management
router.get('/schedules', authorize('superadmin', 'admin', 'principal'), getSchedules);
router.post('/schedules', authorize('superadmin', 'admin', 'principal'), createSchedule);
router.put('/schedules/:id', authorize('superadmin', 'admin', 'principal'), updateSchedule);
router.delete('/schedules/:id', authorize('superadmin', 'admin', 'principal'), deleteSchedule);

// Location & Geofencing Settings
router.get('/location', authorize('superadmin', 'admin', 'principal', 'teacher'), getSchoolLocation);
router.put('/location', authorize('superadmin', 'admin', 'principal'), updateSchoolLocation);

// Holidays Management
router.get('/holidays', authorize('superadmin', 'admin', 'principal', 'teacher'), getHolidays);
router.post('/holidays', authorize('superadmin', 'admin', 'principal'), createHoliday);
router.delete('/holidays/:id', authorize('superadmin', 'admin', 'principal'), deleteHoliday);

// Correction Requests Approval
router.get('/corrections', authorize('superadmin', 'admin', 'principal'), getCorrections);
router.put('/corrections/:id/review', authorize('superadmin', 'admin', 'principal'), reviewCorrection);

export default router;
