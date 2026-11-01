import { Router } from 'express';
import {
  getQuestionPapers,
  getQuestionPaperById,
  createQuestionPaper,
  updateQuestionPaper,
  duplicateQuestionPaper,
  deleteQuestionPaper,
} from '../controllers/questionPaperController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', authorize('superadmin', 'principal', 'admin', 'teacher'), getQuestionPapers);
router.post('/', authorize('superadmin', 'principal', 'admin', 'teacher'), createQuestionPaper);

router.get('/:id', authorize('superadmin', 'principal', 'admin', 'teacher'), getQuestionPaperById);
router.put('/:id', authorize('superadmin', 'principal', 'admin', 'teacher'), updateQuestionPaper);
router.post('/:id/duplicate', authorize('superadmin', 'principal', 'admin', 'teacher'), duplicateQuestionPaper);
router.delete('/:id', authorize('superadmin', 'principal', 'admin', 'teacher'), deleteQuestionPaper);

export default router;
