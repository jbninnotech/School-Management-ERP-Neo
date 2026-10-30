import Notification from '../models/notificationModel.js';
import User from '../models/userModel.js';

/**
 * Find all eligible students for an examination based on class & section.
 */
export const findEligibleStudents = async (exam) => {
  const query = {
    role: 'student',
    isActive: true,
    'studentProfile.classGrade': exam.classGrade,
  };

  if (exam.sections && Array.isArray(exam.sections) && exam.sections.length > 0) {
    query['studentProfile.section'] = { $in: exam.sections };
  }

  return await User.find(query).select('_id name email studentProfile');
};

/**
 * Format human-readable date/time string for notification body.
 */
const formatExamDateTime = (examDate, startTime) => {
  try {
    const d = examDate ? new Date(examDate) : new Date();
    const dateStr = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = startTime
      ? new Date(startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : 'TBA';
    return `${dateStr} at ${timeStr}`;
  } catch {
    return 'Scheduled date';
  }
};

/**
 * Create or update notifications when an exam is scheduled or rescheduled.
 * Prevents duplicate notifications for unchanged exams.
 */
export const notifyStudentsExamScheduled = async (exam, isReschedule = false) => {
  try {
    const eligibleStudents = await findEligibleStudents(exam);
    if (!eligibleStudents || eligibleStudents.length === 0) {
      console.log(`[NotificationService] No eligible students found for exam "${exam.title}" (${exam.classGrade})`);
      return { count: 0 };
    }

    const examMeta = {
      examTitle: exam.title,
      subject: exam.subject,
      classGrade: exam.classGrade,
      sections: exam.sections || [],
      examDate: exam.examDate,
      startTime: exam.startTime,
      endTime: exam.endTime,
      durationMinutes: exam.durationMinutes || 60,
      totalMarks: exam.totalMarks || 100,
      status: exam.status || 'scheduled',
    };

    const dateTimeDisplay = formatExamDateTime(exam.examDate, exam.startTime);
    let notificationsCount = 0;

    for (const student of eligibleStudents) {
      // Check if an existing notification exists for this student & exam
      const existing = await Notification.findOne({
        recipient: student._id,
        examination: exam._id,
      });

      if (isReschedule || (existing && (
        existing.examMetadata.examDate?.getTime() !== exam.examDate?.getTime() ||
        existing.examMetadata.startTime?.getTime() !== exam.startTime?.getTime()
      ))) {
        // Schedule changed: Update existing or create clearly identified schedule change
        if (existing) {
          existing.type = 'exam_rescheduled';
          existing.title = `Exam Rescheduled: ${exam.title}`;
          existing.message = `The schedule for ${exam.subject} (${exam.title}) has been updated to ${dateTimeDisplay}. Duration: ${exam.durationMinutes} mins.`;
          existing.examMetadata = examMeta;
          existing.isRead = false; // Mark unread so student sees update
          existing.readAt = null;
          await existing.save();
          notificationsCount++;
        } else {
          await Notification.create({
            recipient: student._id,
            examination: exam._id,
            type: 'exam_rescheduled',
            title: `Exam Rescheduled: ${exam.title}`,
            message: `The schedule for ${exam.subject} (${exam.title}) has been updated to ${dateTimeDisplay}. Duration: ${exam.durationMinutes} mins.`,
            examMetadata: examMeta,
            isRead: false,
          });
          notificationsCount++;
        }
      } else if (!existing) {
        // First-time schedule notification
        await Notification.create({
          recipient: student._id,
          examination: exam._id,
          type: 'exam_scheduled',
          title: `New Exam Scheduled: ${exam.title}`,
          message: `Examination for ${exam.subject} (${exam.classGrade}) is scheduled for ${dateTimeDisplay}. Duration: ${exam.durationMinutes} mins, Total Marks: ${exam.totalMarks}.`,
          examMetadata: examMeta,
          isRead: false,
        });
        notificationsCount++;
      } else {
        // Existing notification with unchanged schedule: refresh metadata silently without spamming
        existing.examMetadata = examMeta;
        await existing.save();
      }
    }

    console.log(`[NotificationService] Dispatched/updated notifications to ${notificationsCount} eligible students for exam "${exam.title}"`);
    return { count: notificationsCount };
  } catch (error) {
    console.error('[NotificationService] Error sending scheduled notifications:', error);
    throw error;
  }
};

/**
 * Notify eligible students when an exam is cancelled.
 */
export const notifyStudentsExamCancelled = async (exam) => {
  try {
    const eligibleStudents = await findEligibleStudents(exam);
    const examMeta = {
      examTitle: exam.title,
      subject: exam.subject,
      classGrade: exam.classGrade,
      sections: exam.sections || [],
      examDate: exam.examDate,
      startTime: exam.startTime,
      endTime: exam.endTime,
      durationMinutes: exam.durationMinutes || 60,
      totalMarks: exam.totalMarks || 100,
      status: 'cancelled',
    };

    let notificationsCount = 0;
    for (const student of eligibleStudents) {
      const existing = await Notification.findOne({
        recipient: student._id,
        examination: exam._id,
      });

      if (existing) {
        existing.type = 'exam_cancelled';
        existing.title = `Exam Cancelled: ${exam.title}`;
        existing.message = `The examination for ${exam.subject} (${exam.title}) scheduled for ${formatExamDateTime(exam.examDate, exam.startTime)} has been cancelled.`;
        existing.examMetadata = examMeta;
        existing.isRead = false;
        existing.readAt = null;
        await existing.save();
        notificationsCount++;
      } else {
        await Notification.create({
          recipient: student._id,
          examination: exam._id,
          type: 'exam_cancelled',
          title: `Exam Cancelled: ${exam.title}`,
          message: `The examination for ${exam.subject} (${exam.title}) has been cancelled by faculty.`,
          examMetadata: examMeta,
          isRead: false,
        });
        notificationsCount++;
      }
    }

    return { count: notificationsCount };
  } catch (error) {
    console.error('[NotificationService] Error sending cancel notifications:', error);
    throw error;
  }
};

/**
 * Notify eligible students when results are released.
 */
export const notifyStudentsResultsPublished = async (exam) => {
  try {
    const eligibleStudents = await findEligibleStudents(exam);
    let notificationsCount = 0;

    for (const student of eligibleStudents) {
      await Notification.create({
        recipient: student._id,
        examination: exam._id,
        type: 'results_published',
        title: `Results Released: ${exam.title}`,
        message: `Results and performance report for ${exam.subject} (${exam.title}) have been officially published. Check your scorecard now.`,
        examMetadata: {
          examTitle: exam.title,
          subject: exam.subject,
          classGrade: exam.classGrade,
          sections: exam.sections || [],
          status: 'results_published',
        },
        isRead: false,
      });
      notificationsCount++;
    }

    return { count: notificationsCount };
  } catch (error) {
    console.error('[NotificationService] Error sending results published notifications:', error);
    throw error;
  }
};
