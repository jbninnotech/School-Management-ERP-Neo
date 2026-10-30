import User from '../models/userModel.js';
import Examination from '../models/examinationModel.js';
import ExaminationAttempt from '../models/examinationAttemptModel.js';
import Notification from '../models/notificationModel.js';

/**
 * Superadmin & Admin Dashboard Overview
 */
export const getAdminDashboardStats = async (req, res, next) => {
  try {
    const stats = await User.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = {
      superadmin: 0,
      admin: 0,
      teacher: 0,
      student: 0,
    };

    stats.forEach((item) => {
      summary[item._id] = item.count;
    });

    const totalExams = await Examination.countDocuments();
    const scheduledExams = await Examination.countDocuments({ status: { $in: ['scheduled', 'published'] } });
    const liveExams = await Examination.countDocuments({ status: 'in_progress' });

    res.status(200).json({
      success: true,
      message: 'Dashboard metrics retrieved successfully',
      data: {
        summaryCards: {
          totalStudents: summary.student,
          totalTeachers: summary.teacher,
          totalAdmins: summary.admin + summary.superadmin,
          totalExams,
          scheduledExams,
          liveExams,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Teacher Examination Management & Dashboard Overview
 */
export const getTeacherDashboardStats = async (req, res, next) => {
  try {
    const teacherId = req.user._id;
    const assignedClasses = req.user.teacherProfile?.assignedClasses || [];

    const examFilter = assignedClasses.length > 0
      ? { $or: [{ createdBy: teacherId }, { classGrade: { $in: assignedClasses } }] }
      : { createdBy: teacherId };

    const exams = await Examination.find(examFilter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    const totalExams = exams.length;
    const draftExams = exams.filter((e) => e.status === 'draft').length;
    const scheduledExams = exams.filter((e) => ['scheduled', 'published'].includes(e.status)).length;
    const liveExams = exams.filter((e) => e.status === 'in_progress').length;
    const completedExams = exams.filter((e) => ['completed', 'results_published'].includes(e.status)).length;

    const examIds = exams.map((e) => e._id);
    const pendingEvaluations = await ExaminationAttempt.countDocuments({
      examination: { $in: examIds },
      status: 'evaluation_pending',
    });

    const totalAttempts = await ExaminationAttempt.countDocuments({
      examination: { $in: examIds },
    });

    // Submissions count per exam for recent exams table
    const recentExamsWithStats = await Promise.all(
      exams.slice(0, 10).map(async (exam) => {
        const attemptsCount = await ExaminationAttempt.countDocuments({ examination: exam._id });
        const pendingCount = await ExaminationAttempt.countDocuments({
          examination: exam._id,
          status: 'evaluation_pending',
        });
        return {
          ...exam.toObject(),
          attemptsCount,
          pendingEvaluationsCount: pendingCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      message: 'Teacher dashboard metrics retrieved successfully',
      data: {
        summaryCards: {
          totalExams,
          draftExams,
          scheduledExams,
          liveExams,
          completedExams,
          pendingEvaluations,
          totalAttempts,
        },
        recentExams: recentExamsWithStats,
        assignedClasses,
        assignedSubjects: req.user.teacherProfile?.assignedSubjects || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Student Dashboard & Scheduled Examinations Hub
 */
export const getStudentDashboardStats = async (req, res, next) => {
  try {
    const student = req.user;
    const studentClass = student.studentProfile?.classGrade;
    const studentSection = student.studentProfile?.section;

    if (!studentClass) {
      return res.status(200).json({
        success: true,
        message: 'No class assigned to student profile',
        data: {
          summaryCards: {
            availableNow: 0,
            upcoming: 0,
            inProgress: 0,
            completed: 0,
            resultsAvailable: 0,
          },
          exams: [],
          categorized: {
            availableNow: [],
            upcoming: [],
            inProgress: [],
            completed: [],
            resultsAvailable: [],
          },
          unreadNotificationsCount: 0,
        },
      });
    }

    // Build query for exams eligible for this student
    const examQuery = {
      classGrade: studentClass,
      status: { $in: ['scheduled', 'published', 'in_progress', 'completed', 'results_published', 'cancelled'] },
    };

    if (studentSection) {
      examQuery.$or = [
        { sections: studentSection },
        { sections: { $size: 0 } },
        { sections: { $exists: false } },
      ];
    }

    const eligibleExams = await Examination.find(examQuery)
      .populate('createdBy', 'name email')
      .sort({ examDate: 1, startTime: 1, createdAt: -1 })
      .lean();

    const now = new Date();

    // Fetch student's attempts for all eligible exams
    const studentAttempts = await ExaminationAttempt.find({
      student: student._id,
      examination: { $in: eligibleExams.map((e) => e._id) },
    }).lean();

    const attemptsByExamId = {};
    studentAttempts.forEach((att) => {
      attemptsByExamId[att.examination.toString()] = att;
    });

    const unreadNotificationsCount = await Notification.countDocuments({
      recipient: student._id,
      isRead: false,
    });

    const categorized = {
      availableNow: [],
      upcoming: [],
      inProgress: [],
      completed: [],
      resultsAvailable: [],
    };

    const enhancedExams = eligibleExams.map((exam) => {
      // Security: Strip out any answer keys or teacher explanations
      if (exam.examSections) {
        exam.examSections.forEach((s) => {
          if (s.questions) {
            s.questions.forEach((q) => {
              delete q.correctAnswer;
              delete q.explanation;
            });
          }
        });
      }

      const attempt = attemptsByExamId[exam._id.toString()] || null;
      const startTime = exam.startTime ? new Date(exam.startTime) : null;
      const endTime = exam.endTime ? new Date(exam.endTime) : null;

      let studentStatus = 'scheduled'; // default
      let isAvailableToStart = false;
      let isResumable = false;
      let hasCompleted = false;
      let hasResults = false;

      if (exam.status === 'cancelled') {
        studentStatus = 'cancelled';
      } else if (attempt) {
        if (attempt.status === 'in_progress') {
          // Check if attempt deadline expired
          if (now > new Date(attempt.deadline)) {
            studentStatus = 'submitted';
            hasCompleted = true;
          } else {
            studentStatus = 'in_progress';
            isResumable = true;
          }
        } else if (['submitted', 'auto_submitted', 'evaluation_pending', 'evaluated'].includes(attempt.status)) {
          studentStatus = 'completed';
          hasCompleted = true;
          if (attempt.isResultPublished || exam.status === 'results_published' || exam.isPracticeMode) {
            hasResults = true;
            studentStatus = 'results_released';
          }
        } else if (attempt.status === 'result_published') {
          studentStatus = 'results_released';
          hasCompleted = true;
          hasResults = true;
        }
      } else {
        // No attempt yet
        if (exam.status === 'completed' || (endTime && now > endTime)) {
          studentStatus = 'missed';
        } else if (startTime && now < startTime) {
          studentStatus = 'upcoming';
        } else {
          // Current time is past startTime and before endTime (or no strict window)
          studentStatus = 'available_now';
          isAvailableToStart = true;
        }
      }

      // Time remaining calculation
      let timeRemainingSeconds = 0;
      let timeRemainingLabel = '';

      if (studentStatus === 'upcoming' && startTime) {
        timeRemainingSeconds = Math.max(0, Math.floor((startTime.getTime() - now.getTime()) / 1000));
        const hours = Math.floor(timeRemainingSeconds / 3600);
        const mins = Math.floor((timeRemainingSeconds % 3600) / 60);
        const secs = timeRemainingSeconds % 60;
        timeRemainingLabel = `${hours}h ${mins}m ${secs}s`;
      } else if (studentStatus === 'in_progress' && attempt?.deadline) {
        timeRemainingSeconds = Math.max(0, Math.floor((new Date(attempt.deadline).getTime() - now.getTime()) / 1000));
        const mins = Math.floor(timeRemainingSeconds / 60);
        const secs = timeRemainingSeconds % 60;
        timeRemainingLabel = `${mins}m ${secs}s`;
      }

      const examRecord = {
        ...exam,
        studentAttempt: attempt ? {
          _id: attempt._id,
          status: attempt.status,
          startedAt: attempt.startedAt,
          deadline: attempt.deadline,
          submittedAt: attempt.submittedAt,
          isResultPublished: attempt.isResultPublished,
          score: (attempt.isResultPublished || exam.isPracticeMode) ? attempt.score : undefined,
        } : null,
        studentStatus,
        isAvailableToStart,
        isResumable,
        hasCompleted,
        hasResults,
        timeRemainingSeconds,
        timeRemainingLabel,
      };

      // Categorize
      if (isResumable) {
        categorized.inProgress.push(examRecord);
      } else if (hasResults) {
        categorized.resultsAvailable.push(examRecord);
      } else if (hasCompleted) {
        categorized.completed.push(examRecord);
      } else if (isAvailableToStart) {
        categorized.availableNow.push(examRecord);
      } else if (studentStatus === 'upcoming') {
        categorized.upcoming.push(examRecord);
      }

      return examRecord;
    });

    res.status(200).json({
      success: true,
      message: 'Student examination dashboard data retrieved',
      data: {
        summaryCards: {
          availableNow: categorized.availableNow.length,
          upcoming: categorized.upcoming.length,
          inProgress: categorized.inProgress.length,
          completed: categorized.completed.length,
          resultsAvailable: categorized.resultsAvailable.length,
        },
        categorized,
        exams: enhancedExams,
        unreadNotificationsCount,
        studentInfo: {
          name: student.name,
          rollNumber: student.studentProfile?.rollNumber || '',
          classGrade: studentClass,
          section: studentSection || '',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
