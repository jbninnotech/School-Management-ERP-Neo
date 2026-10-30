import { Router } from 'express';
import multer from 'multer';
import {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  importQuestionsFromFile,
} from '../controllers/questionController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

// Configure multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

const router = Router();

// General CRUD
router.get('/', protect, getQuestions);
router.get('/:id', protect, getQuestionById);
router.post('/', protect, authorize('superadmin', 'admin', 'teacher'), createQuestion);
router.put('/:id', protect, authorize('superadmin', 'admin', 'teacher'), updateQuestion);
router.delete('/:id', protect, authorize('superadmin', 'admin', 'teacher'), deleteQuestion);

// Bulk Upload Endpoint (PDF, Word, Excel, CSV)
router.post(
  '/import',
  protect,
  authorize('superadmin', 'admin', 'teacher'),
  upload.single('file'),
  importQuestionsFromFile
);

export default router;