import { Router } from 'express';
import {
  createExam,
  getExams,
  getExamById,
  updateExam,
  updateQuestionPaper,
  submitForReview,
  reviewExam,
  scheduleExam,
  startExamAttempt,
  saveStudentAnswer,
  recordTabSwitch,
  submitExamAttempt,
  getExamSubmissions,
  getAttemptForEvaluation,
  saveManualEvaluation,
  togglePublishResults,
  getExamAnalytics,
  getStudentResult,
} from '../controllers/examController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

// General Exam Management
router.get('/', protect, getExams);
router.post('/', protect, authorize('superadmin', 'admin', 'teacher'), createExam);
router.get('/:id', protect, getExamById);
router.put('/:id', protect, authorize('superadmin', 'admin', 'teacher'), updateExam);
router.put('/:id/paper', protect, authorize('superadmin', 'admin', 'teacher'), updateQuestionPaper);

// Approval & Scheduling Workflow
router.put('/:id/submit-review', protect, authorize('superadmin', 'admin', 'teacher'), submitForReview);
router.put('/:id/review', protect, authorize('superadmin', 'admin'), reviewExam);
router.put('/:id/schedule', protect, authorize('superadmin', 'admin', 'teacher'), scheduleExam);

// Student Dedicated Exam Portal
router.post('/:id/start-attempt', protect, authorize('student'), startExamAttempt);
router.post('/save-answer', protect, authorize('student'), saveStudentAnswer);
router.post('/tab-switch', protect, authorize('student'), recordTabSwitch);
router.post('/submit-attempt', protect, submitExamAttempt);

// Teacher / Admin Evaluation
router.get('/:examId/submissions', protect, authorize('superadmin', 'admin', 'teacher'), getExamSubmissions);
router.get('/attempt/:attemptId', protect, authorize('superadmin', 'admin', 'teacher'), getAttemptForEvaluation);
router.post('/attempt/:attemptId/evaluate', protect, authorize('superadmin', 'admin', 'teacher'), saveManualEvaluation);

// Results & Analytics
router.post('/:examId/publish', protect, authorize('superadmin', 'admin'), togglePublishResults);
router.get('/:examId/analytics', protect, authorize('superadmin', 'admin', 'teacher'), getExamAnalytics);
router.get('/:examId/results', protect, getStudentResult);

export default router;
