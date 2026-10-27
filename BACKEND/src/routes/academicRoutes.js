import { Router } from 'express';
import {
  getAcademicStructure,
  updateAcademicStructure,
} from '../controllers/academicController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', protect, getAcademicStructure);
router.put('/', protect, authorize('superadmin', 'admin'), updateAcademicStructure);

export default router;
