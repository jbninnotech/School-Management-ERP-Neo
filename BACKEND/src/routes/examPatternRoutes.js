import express from 'express';
import {
  getExamPatterns,
  getExamPatternById,
  createExamPattern,
  updateExamPattern,
  deleteExamPattern,
  assignTeachersToPattern,
} from '../controllers/examPatternController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), getExamPatterns);
router.get('/:id', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), getExamPatternById);
router.post('/', protect, authorize('superadmin', 'principal', 'admin'), createExamPattern);
router.put('/:id', protect, authorize('superadmin', 'principal', 'admin'), updateExamPattern);
router.delete('/:id', protect, authorize('superadmin', 'principal', 'admin'), deleteExamPattern);
router.put('/:id/assign', protect, authorize('superadmin', 'principal', 'admin'), assignTeachersToPattern);

export default router;
