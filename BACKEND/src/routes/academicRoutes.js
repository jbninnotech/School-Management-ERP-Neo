import { Router } from 'express';
import {
  getAcademicStructure,
  updateAcademicStructure,
  getSubjects,
} from '../controllers/academicController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', protect, getAcademicStructure);
router.get('/subjects', protect, getSubjects);
router.put('/', protect, authorize('superadmin', 'admin'), updateAcademicStructure);

export default router;
