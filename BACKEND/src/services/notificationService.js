import Notification from '../models/notificationModel.js';
import User from '../models/userModel.js';
import { emitNotificationToUser } from '../server.js';

/**
 * Universal Centralized createNotification Helper
 * Ensures every notification is created through this function.
 */
export const createNotification = async ({
  recipient,
  type,
  title,
  message,
  link = '',
  examination = null,
  examMetadata = {},
}) => {
  try {
    const notif = await Notification.create({
      recipient,
      type,
      title,
      message,
      link,
      examination: examination?._id || examination,
      examMetadata: {
        examTitle: examination?.title || examMetadata.examTitle || '',
        subject: examination?.subject || examMetadata.subject || '',
        classGrade: examination?.classGrade || examMetadata.classGrade || '',
        sections: examination?.sections || examMetadata.sections || [],
        examDate: examination?.examDate || examMetadata.examDate,
        startTime: examination?.startTime || examMetadata.startTime,
        endTime: examination?.endTime || examMetadata.endTime,
        durationMinutes: examination?.durationMinutes || examMetadata.durationMinutes || 60,
        totalMarks: examination?.totalMarks || examMetadata.totalMarks || 100,
        status: examination?.status || examMetadata.status || 'scheduled',
      },
      isRead: false,
    });

    try {
      emitNotificationToUser(recipient.toString(), notif);
    } catch (_) {}

    return notif;
  } catch (err) {
    console.error('[createNotification Error]:', err.message);
    return null;
  }
};

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
 * Notify eligible students when an exam goes LIVE (Manual or Auto Go-Live)
 */
export const notifyStudentsExamGoLive = async (exam) => {
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
      status: 'live',
    };

    let notificationsCount = 0;
    for (const student of eligibleStudents) {
      const notif = await Notification.create({
        recipient: student._id,
        examination: exam._id,
        type: 'exam_now_available',
        title: `🔴 Exam is NOW LIVE: ${exam.title}`,
        message: `The examination for ${exam.subject} (${exam.classGrade}) is LIVE now! You can start your attempt now. Duration: ${exam.durationMinutes} mins.`,
        examMetadata: examMeta,
        isRead: false,
      });

      try {
        emitNotificationToUser(student._id.toString(), notif);
      } catch (err) {
        // Socket emission failure safe
      }
      notificationsCount++;
    }

    console.log(`[NotificationService] Sent GO LIVE alert to ${notificationsCount} students for "${exam.title}"`);
    return { count: notificationsCount };
  } catch (error) {
    console.error('[NotificationService] Error sending go live notifications:', error);
    throw error;
  }
};

/**
 * Notify eligible students when an exam is PAUSED
 */
export const notifyStudentsExamPaused = async (exam, reason = '') => {
  try {
    const eligibleStudents = await findEligibleStudents(exam);
    for (const student of eligibleStudents) {
      const notif = await Notification.create({
        recipient: student._id,
        examination: exam._id,
        type: 'exam_rescheduled',
        title: `⏸️ Exam Paused: ${exam.title}`,
        message: `The ongoing examination for ${exam.subject} has been temporarily paused. Reason: ${reason || 'Technical / Faculty directive'}. Stand by.`,
        examMetadata: {
          examTitle: exam.title,
          subject: exam.subject,
          classGrade: exam.classGrade,
          status: 'paused',
        },
        isRead: false,
      });

      try {
        emitNotificationToUser(student._id.toString(), notif);
      } catch (e) {}
    }
  } catch (error) {
    console.error('[NotificationService] Error sending paused notifications:', error);
  }
};

/**
 * Notify eligible students when an exam is RESUMED
 */
export const notifyStudentsExamResumed = async (exam) => {
  try {
    const eligibleStudents = await findEligibleStudents(exam);
    for (const student of eligibleStudents) {
      const notif = await Notification.create({
        recipient: student._id,
        examination: exam._id,
        type: 'exam_now_available',
        title: `▶️ Exam Resumed: ${exam.title}`,
        message: `The examination for ${exam.subject} has resumed. Please continue your attempt immediately.`,
        examMetadata: {
          examTitle: exam.title,
          subject: exam.subject,
          classGrade: exam.classGrade,
          status: 'live',
        },
        isRead: false,
      });

      try {
        emitNotificationToUser(student._id.toString(), notif);
      } catch (e) {}
    }
  } catch (error) {
    console.error('[NotificationService] Error sending resumed notifications:', error);
  }
};

/**
 * Notify eligible students when an exam is ENDED by faculty/admin
 */
export const notifyStudentsExamEnded = async (exam) => {
  try {
    const eligibleStudents = await findEligibleStudents(exam);
    for (const student of eligibleStudents) {
      const notif = await Notification.create({
        recipient: student._id,
        examination: exam._id,
        type: 'exam_submitted_successfully',
        title: `🏁 Exam Ended: ${exam.title}`,
        message: `The examination for ${exam.subject} has been officially concluded. All submitted attempts have been closed for evaluation.`,
        examMetadata: {
          examTitle: exam.title,
          subject: exam.subject,
          classGrade: exam.classGrade,
          status: 'completed',
        },
        isRead: false,
      });

      try {
        emitNotificationToUser(student._id.toString(), notif);
      } catch (e) {}
    }
  } catch (error) {
    console.error('[NotificationService] Error sending exam ended notifications:', error);
  }
};

/**
 * Create or update notifications when an exam is scheduled or rescheduled.
 */
export const notifyStudentsExamScheduled = async (exam, isReschedule = false) => {
  try {
    const eligibleStudents = await findEligibleStudents(exam);
    if (!eligibleStudents || eligibleStudents.length === 0) {
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
      const existing = await Notification.findOne({
        recipient: student._id,
        examination: exam._id,
      });

      let notif;
      if (isReschedule || (existing && (
        existing.examMetadata.examDate?.getTime() !== exam.examDate?.getTime() ||
        existing.examMetadata.startTime?.getTime() !== exam.startTime?.getTime()
      ))) {
        if (existing) {
          existing.type = 'exam_rescheduled';
          existing.title = `Exam Rescheduled: ${exam.title}`;
          existing.message = `The schedule for ${exam.subject} (${exam.title}) has been updated to ${dateTimeDisplay}. Duration: ${exam.durationMinutes} mins.`;
          existing.examMetadata = examMeta;
          existing.isRead = false;
          existing.readAt = null;
          await existing.save();
          notif = existing;
          notificationsCount++;
        } else {
          notif = await Notification.create({
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
        notif = await Notification.create({
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
        existing.examMetadata = examMeta;
        await existing.save();
        notif = existing;
      }

      if (notif) {
        try {
          emitNotificationToUser(student._id.toString(), notif);
        } catch (e) {}
      }
    }

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

      let notif;
      if (existing) {
        existing.type = 'exam_cancelled';
        existing.title = `Exam Cancelled: ${exam.title}`;
        existing.message = `The examination for ${exam.subject} (${exam.title}) scheduled for ${formatExamDateTime(exam.examDate, exam.startTime)} has been cancelled.`;
        existing.examMetadata = examMeta;
        existing.isRead = false;
        existing.readAt = null;
        await existing.save();
        notif = existing;
        notificationsCount++;
      } else {
        notif = await Notification.create({
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

      if (notif) {
        try {
          emitNotificationToUser(student._id.toString(), notif);
        } catch (e) {}
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
      const notif = await Notification.create({
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

      try {
        emitNotificationToUser(student._id.toString(), notif);
      } catch (e) {}
      notificationsCount++;
    }

    return { count: notificationsCount };
  } catch (error) {
    console.error('[NotificationService] Error sending results published notifications:', error);
    throw error;
  }
};
