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
  publishExam,
  cancelExam,
  startExamAttempt,
  saveStudentAnswer,
  saveAttemptAnswerDirect,
  attemptHeartbeat,
  recordTabSwitch,
  submitExamAttempt,
  resetStudentAttempts,
  getExamSubmissions,
  getAttemptForEvaluation,
  saveManualEvaluation,
  togglePublishResults,
  getExamAnalytics,
  getStudentResult,
  getExamMonitor, // <--- 1. ADDED IMPORT
} from '../controllers/examController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

// General Exam Management
router.get('/', protect, getExams);
router.post('/', protect, authorize('superadmin', 'admin', 'teacher'), createExam);

// Specific Attempt Endpoints (Must be registered BEFORE parameterized '/:id' routes)
router.post('/attempts/:attemptId/heartbeat', protect, attemptHeartbeat);
router.put('/attempts/:attemptId/answers/:questionId', protect, saveAttemptAnswerDirect);
router.post('/attempts/:attemptId/submit', protect, submitExamAttempt);
router.post('/save-answer', protect, authorize('student'), saveStudentAnswer);
router.post('/tab-switch', protect, authorize('student'), recordTabSwitch);
router.post('/submit-attempt', protect, submitExamAttempt);

// Approval & Scheduling Workflow
router.get('/:id', protect, getExamById);
router.put('/:id', protect, authorize('superadmin', 'admin', 'teacher'), updateExam);
router.put('/:id/paper', protect, authorize('superadmin', 'admin', 'teacher'), updateQuestionPaper);
router.put('/:id/submit-review', protect, authorize('superadmin', 'admin', 'teacher'), submitForReview);
router.put('/:id/review', protect, authorize('superadmin', 'admin'), reviewExam);
router.put('/:id/schedule', protect, authorize('superadmin', 'admin', 'teacher'), scheduleExam);
router.put('/:id/publish', protect, authorize('superadmin', 'admin', 'teacher'), publishExam);
router.put('/:id/cancel', protect, authorize('superadmin', 'admin', 'teacher'), cancelExam);

// Student Dedicated Exam Portal & Resumption
router.post('/:id/start-attempt', protect, authorize('student'), startExamAttempt);
router.post('/:id/reset-attempts', protect, resetStudentAttempts);

// Teacher / Admin Live Monitoring & Evaluation
router.get('/:examId/monitor', protect, authorize('superadmin', 'admin', 'teacher'), getExamMonitor); // <--- 2. ADDED MONITOR ROUTE
router.get('/:examId/submissions', protect, authorize('superadmin', 'admin', 'teacher'), getExamSubmissions);
router.get('/attempt/:attemptId', protect, authorize('superadmin', 'admin', 'teacher'), getAttemptForEvaluation);
router.post('/attempt/:attemptId/evaluate', protect, authorize('superadmin', 'admin', 'teacher'), saveManualEvaluation);

// Results & Analytics
router.post('/:examId/publish', protect, authorize('superadmin', 'admin', 'teacher'), togglePublishResults);
router.post('/:examId/publish-results', protect, authorize('superadmin', 'admin', 'teacher'), togglePublishResults);
router.get('/:examId/analytics', protect, authorize('superadmin', 'admin', 'teacher'), getExamAnalytics);
router.get('/:examId/results', protect, getStudentResult);

export default router;