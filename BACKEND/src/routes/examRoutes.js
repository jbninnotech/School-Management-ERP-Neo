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
  logAttemptViolation,
  submitExamAttempt,
  resetStudentAttempts,
  getExamSubmissions,
  getAttemptForEvaluation,
  saveManualEvaluation,
  togglePublishResults,
  getExamAnalytics,
  getStudentResult,
  getExamMonitor,
  goLiveExam,
  pauseExam,
  resumeExam,
  endExam,
} from '../controllers/examController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

// General Exam Management
router.get('/', protect, getExams);
router.post('/', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), createExam);

// Specific Attempt Endpoints (Must be registered BEFORE parameterized '/:id' routes)
router.post('/attempts/:attemptId/heartbeat', protect, attemptHeartbeat);
router.post('/attempts/:attemptId/violation', protect, logAttemptViolation);
router.put('/attempts/:attemptId/answers/:questionId', protect, saveAttemptAnswerDirect);
router.post('/attempts/:attemptId/submit', protect, submitExamAttempt);
router.post('/save-answer', protect, authorize('student'), saveStudentAnswer);
router.post('/tab-switch', protect, authorize('student'), recordTabSwitch);
router.post('/submit-attempt', protect, submitExamAttempt);

// Approval & Scheduling Workflow
router.get('/:id', protect, getExamById);
router.put('/:id', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), updateExam);
router.put('/:id/paper', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), updateQuestionPaper);
router.put('/:id/submit-review', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), submitForReview);

// Review (approve/reject) — Principal + Admin level only
router.put('/:id/review', protect, authorize('superadmin', 'principal', 'admin'), reviewExam);

// Schedule — Teacher (after approval) + Admin level
router.put('/:id/schedule', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), scheduleExam);

// Publish & Cancel — Admin level + Teacher (for own exams)
router.put('/:id/publish', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), publishExam);
router.put('/:id/cancel', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), cancelExam);

// Real-Time Live Control Operations (GO LIVE, PAUSE, RESUME, END)
router.post('/:id/go-live', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), goLiveExam);
router.post('/:examId/go-live', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), goLiveExam);

router.post('/:id/pause', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), pauseExam);
router.post('/:examId/pause', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), pauseExam);

router.post('/:id/resume', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), resumeExam);
router.post('/:examId/resume', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), resumeExam);

router.post('/:id/end', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), endExam);
router.post('/:examId/end', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), endExam);

// Student Dedicated Exam Portal & Resumption
router.post('/:id/start-attempt', protect, authorize('student'), startExamAttempt);
router.post('/:id/reset-attempts', protect, resetStudentAttempts);

// Teacher / Admin Live Monitoring & Evaluation
router.get('/:examId/monitor', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), getExamMonitor);
router.get('/:examId/submissions', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), getExamSubmissions);
router.get('/attempt/:attemptId', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), getAttemptForEvaluation);
router.post('/attempt/:attemptId/evaluate', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), saveManualEvaluation);

// Results & Analytics
router.post('/:examId/publish', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), togglePublishResults);
router.post('/:examId/publish-results', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), togglePublishResults);
router.get('/:examId/analytics', protect, authorize('superadmin', 'principal', 'admin', 'teacher'), getExamAnalytics);
router.get('/:examId/results', protect, getStudentResult);

export default router;
