import Examination from '../models/examinationModel.js';
import ExaminationAttempt from '../models/examinationAttemptModel.js';
import AttemptAnswer from '../models/attemptAnswerModel.js';
import User from '../models/userModel.js';
import { checkAndAutoSubmitExpiredAttempts } from './examEngineService.js';

export const getLiveExamMonitorData = async (examId) => {
  // First, lazily process any expired attempts for this exam
  await checkAndAutoSubmitExpiredAttempts(examId);

  const exam = await Examination.findById(examId);
  if (!exam) throw new Error('Examination not found');

  const serverNow = new Date();

  // Find all eligible students
  const studentQuery = {
    role: 'student',
    'studentProfile.classGrade': exam.classGrade,
    isActive: { $ne: false },
  };

  if (exam.sections && exam.sections.length > 0) {
    studentQuery['studentProfile.section'] = { $in: exam.sections };
  }

  const eligibleStudents = await User.find(studentQuery)
    .select('name email schoolId studentProfile profilePhoto')
    .sort({ 'studentProfile.section': 1, 'studentProfile.rollNumber': 1, name: 1 });

  // Find all attempts for this exam
  const attempts = await ExaminationAttempt.find({ examination: examId }).lean();
  const attemptMap = new Map();
  attempts.forEach((att) => {
    attemptMap.set(String(att.student), att);
  });

  // Load answer counts per attempt
  const attemptIds = attempts.map((a) => a._id);
  const answerCounts = await AttemptAnswer.aggregate([
    { $match: { attemptId: { $in: attemptIds }, isAnswered: true } },
    { $group: { _id: '$attemptId', answeredCount: { $sum: 1 } } },
  ]);
  const answerCountMap = new Map();
  answerCounts.forEach((ac) => answerCountMap.set(String(ac._id), ac.answeredCount));

  // Determine window state
  const isWindowClosed = exam.status === 'completed' || (exam.endTime && serverNow > exam.endTime);

  const roster = [];
  const statusCounts = {
    not_started: 0,
    in_progress: 0,
    disconnected: 0,
    submitted: 0,
    auto_submitted: 0,
    absent: 0,
    excused: 0,
    extension_granted: 0,
  };

  const sectionCounts = {};
  exam.sections.forEach((sec) => {
    sectionCounts[sec] = {
      section: sec,
      total: 0,
      in_progress: 0,
      submitted: 0,
      absent: 0,
    };
  });

  for (const stu of eligibleStudents) {
    const stuIdStr = String(stu._id);
    const stuSec = stu.studentProfile?.section || 'A';
    const att = attemptMap.get(stuIdStr);

    let status = 'not_started';
    let statusLabel = 'Not Started';
    let statusColor = '#9AA5B1'; // Grey
    let answeredCount = 0;
    let timeRemainingSec = 0;
    let lastHeartbeatAt = null;
    let lastSavedAt = null;

    if (!sectionCounts[stuSec]) {
      sectionCounts[stuSec] = { section: stuSec, total: 0, in_progress: 0, submitted: 0, absent: 0 };
    }
    sectionCounts[stuSec].total += 1;

    if (!att) {
      if (isWindowClosed) {
        status = 'absent';
        statusLabel = 'Absent';
        statusColor = '#D64545'; // Red
        sectionCounts[stuSec].absent += 1;
      } else {
        status = 'not_started';
        statusLabel = 'Not Started';
        statusColor = '#9AA5B1';
      }
    } else {
      answeredCount = answerCountMap.get(String(att._id)) || 0;
      lastHeartbeatAt = att.lastHeartbeatAt;
      lastSavedAt = att.updatedAt;

      if (att.isExcused) {
        status = 'excused';
        statusLabel = 'Excused / Exempt';
        statusColor = '#7B5EA7'; // Purple
      } else if (['submitted', 'evaluated', 'result_published'].includes(att.status)) {
        status = 'submitted';
        statusLabel = 'Submitted';
        statusColor = '#1F5FBF'; // Blue
        sectionCounts[stuSec].submitted += 1;
      } else if (att.status === 'auto_submitted') {
        status = 'auto_submitted';
        statusLabel = 'Auto-Submitted';
        statusColor = '#E8702A'; // Orange
        sectionCounts[stuSec].submitted += 1;
      } else if (att.status === 'in_progress') {
        // Heartbeat threshold: 60s
        const heartbeatAgeSec = att.lastHeartbeatAt
          ? Math.floor((serverNow - new Date(att.lastHeartbeatAt)) / 1000)
          : 999;

        if (heartbeatAgeSec > 60) {
          status = 'disconnected';
          statusLabel = 'Disconnected';
          statusColor = '#F0A500'; // Amber
        } else {
          status = 'in_progress';
          statusLabel = 'In Progress';
          statusColor = '#2E9E5B'; // Green
        }
        sectionCounts[stuSec].in_progress += 1;

        if (att.deadline) {
          timeRemainingSec = Math.max(0, Math.floor((new Date(att.deadline) - serverNow) / 1000));
        }
      }
    }

    if (att && att.extensionMinutesGranted > 0) {
      statusCounts.extension_granted += 1;
    }

    statusCounts[status] = (statusCounts[status] || 0) + 1;

    roster.push({
      studentId: stu._id,
      name: stu.name,
      schoolId: stu.schoolId,
      rollNumber: stu.studentProfile?.rollNumber || '',
      classGrade: stu.studentProfile?.classGrade || exam.classGrade,
      section: stuSec,
      attemptId: att?._id || null,
      status,
      statusLabel,
      statusColor,
      hasExtension: (att?.extensionMinutesGranted || 0) > 0,
      extensionMinutesGranted: att?.extensionMinutesGranted || 0,
      answeredCount,
      totalQuestions: exam.examSections?.reduce((acc, s) => acc + (s.questions?.length || 0), 0) || 0,
      lastHeartbeatAt,
      lastSavedAt,
      timeRemainingSec,
    });
  }

  return {
    exam: {
      id: exam._id,
      title: exam.title,
      examCode: exam.examCode,
      subject: exam.subject,
      classGrade: exam.classGrade,
      sections: exam.sections,
      status: exam.status,
      durationMinutes: exam.durationMinutes,
      startTime: exam.startTime,
      endTime: exam.endTime,
      isWindowClosed,
    },
    serverNow,
    summary: {
      totalEligible: eligibleStudents.length,
      ...statusCounts,
    },
    sectionCounts: Object.values(sectionCounts),
    roster,
  };
};
