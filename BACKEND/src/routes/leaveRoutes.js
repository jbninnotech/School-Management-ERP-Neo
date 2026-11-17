import { Router } from 'express';
import {
  applyLeave,
  getMyLeaves,
  cancelLeave,
  getAdminLeaves,
  adminActionOnLeave,
  teacherActionOnLeave,
  getLeaveStats,
} from '../controllers/leaveController.js';
import { protect, authorize, authorizeAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(protect);

router.post('/', applyLeave);
router.get('/my', getMyLeaves);
router.patch('/:id/cancel', cancelLeave);

router.get('/stats', authorizeAdmin, getLeaveStats);
router.get('/admin', authorizeAdmin, getAdminLeaves);
router.patch('/:id/admin-action', authorizeAdmin, adminActionOnLeave);

router.patch('/:id/teacher-action', authorize('teacher', 'superadmin', 'admin'), teacherActionOnLeave);

export default router;
