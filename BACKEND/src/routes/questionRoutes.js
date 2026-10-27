import { Router } from 'express';
import {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  importQuestions,
  generateBlueprintQuestions,
} from '../controllers/questionController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

// Question Bank access (SuperAdmin, Admin, Teacher)
router.get('/', protect, authorize('superadmin', 'admin', 'teacher'), getQuestions);
router.get('/:id', protect, authorize('superadmin', 'admin', 'teacher'), getQuestionById);
router.post('/', protect, authorize('superadmin', 'admin', 'teacher'), createQuestion);
router.put('/:id', protect, authorize('superadmin', 'admin', 'teacher'), updateQuestion);
router.delete('/:id', protect, authorize('superadmin', 'admin', 'teacher'), deleteQuestion);

// Bulk Import & Blueprint Generator
router.post('/import', protect, authorize('superadmin', 'admin', 'teacher'), importQuestions);
router.post('/blueprint-generate', protect, authorize('superadmin', 'admin', 'teacher'), generateBlueprintQuestions);

export default router;
