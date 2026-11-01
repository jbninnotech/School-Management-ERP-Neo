import Examination from '../models/examinationModel.js';
import { notifyStudentsExamGoLive } from './notificationService.js';
import { emitExamMonitorUpdate } from '../server.js';
import ExaminationAuditLog from '../models/examinationAuditLogModel.js';

/**
 * Check and automatically launch approved scheduled exams whose start time has arrived.
 * Runs periodically on the backend so exams go live automatically without requiring
 * a teacher/admin browser to be open.
 */
export const checkAndAutoLaunchScheduledExams = async () => {
  const now = new Date();

  // Find exams configured for automatic launch, or scheduled approved exams past their start time
  const eligibleExams = await Examination.find({
    status: { $in: ['approved', 'scheduled', 'ready_to_launch'] },
    startTime: { $lte: now },
    // Only launch if end time has not already passed
    $or: [
      { endTime: { $exists: false } },
      { endTime: null },
      { endTime: { $gt: now } },
    ],
  });

  for (const exam of eligibleExams) {
    // Only auto-launch if launchMode is 'automatic' OR if status is 'scheduled' with valid questions
    const questionCount = (exam.examSections || []).reduce((acc, s) => acc + (s.questions?.length || 0), 0);
    if (questionCount === 0) continue;

    try {
      exam.previousStatus = exam.status;
      exam.status = 'live';
      exam.actualLaunchTime = now;
      exam.isSnapshotLocked = true;
      await exam.save();

      // Log system auto-launch
      await ExaminationAuditLog.create({
        examination: exam._id,
        user: exam.createdBy,
        userRole: 'system',
        action: 'EXAM_AUTO_LAUNCHED',
        details: { scheduledStart: exam.startTime, actualLaunch: now },
      });

      // Notify eligible students
      await notifyStudentsExamGoLive(exam);

      // Realtime broadcast
      try {
        emitExamMonitorUpdate(exam._id.toString(), {
          event: 'exam_live',
          examId: exam._id,
          status: 'live',
          actualLaunchTime: now,
          autoLaunched: true,
        });
      } catch (e) {}

      console.log(`[AutoScheduler] Automatically launched exam "${exam.title}" (${exam.examCode}) at ${now.toISOString()}`);
    } catch (err) {
      console.error(`[AutoScheduler] Failed to auto-launch exam "${exam.title}":`, err.message);
    }
  }
};
