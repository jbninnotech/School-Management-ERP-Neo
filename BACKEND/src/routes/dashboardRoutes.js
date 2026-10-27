import { Router } from 'express';
import { getAdminDashboardStats } from '../controllers/dashboardController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

// Route: GET /api/v1/dashboard/admin
router.get('/admin', protect, getAdminDashboardStats);

export default router;