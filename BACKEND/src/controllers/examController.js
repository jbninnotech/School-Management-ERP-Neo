import mongoose from 'mongoose';
import Examination from '../models/examinationModel.js';
import ExaminationAttempt from '../models/examinationAttemptModel.js';
import ExaminationAuditLog from '../models/examinationAuditLogModel.js';
import User from '../models/userModel.js';
import {
  createNotification,
  notifyStudentsExamScheduled,
  notifyStudentsExamCancelled,
  notifyStudentsResultsPublished,
  notifyStudentsExamGoLive,
  notifyStudentsExamPaused,
  notifyStudentsExamResumed,
  notifyStudentsExamEnded,
} from '../services/notificationService.js';
import { getLiveExamMonitorData } from '../services/liveMonitorService.js';
import { emitExamMonitorUpdate } from '../server.js';

// Helper: Log audit event
const logAuditEvent = async (examId, userId, userRole, action, details = {}, ip = '') => {
  try {
    await ExaminationAuditLog.create({
      examination: examId,
      user: userId,
      userRole,
      action,
      details,
      ipAddress: ip,
    });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

// Helper: Safely resolve question identifier
const getQuestionId = (q, fallback = '') => {
  if (!q) return fallback;
  if (q.questionId) return q.questionId.toString();
  if (q._id) return q._id.toString();
  if (q.id) return q.id.toString();
  return fallback;
};

// Helper: Evaluate single question automatically
const autoEvaluateQuestion = (q, studentAnswer, negativeMarkingEnabled, defaultNegativeMarks) => {
  if (studentAnswer === undefined || studentAnswer === null || studentAnswer === '') {
    return { marksAwarded: 0, autoEvaluated: true, isSubjective: false };
  }

  const marks = Number(q.marks) || 1;
  const negMarks = negativeMarkingEnabled ? (Number(q.negativeMarks) || defaultNegativeMarks || 0) : 0;

  switch (q.questionType) {
    case 'single_mcq':
    case 'assertion_reason': {
      const isCorrect = String(studentAnswer).trim() === String(q.correctAnswer).trim();
      return {
        marksAwarded: isCorrect ? marks : -negMarks,
        autoEvaluated: true,
        isSubjective: false,
      };
    }

    case 'true_false': {
      const isCorrect = String(studentAnswer).toLowerCase() === String(q.correctAnswer).toLowerCase();
      return {
        marksAwarded: isCorrect ? marks : -negMarks,
        autoEvaluated: true,
        isSubjective: false,
      };
    }

    case 'multiple_select': {
      const studentArr = Array.isArray(studentAnswer) ? studentAnswer.map(String).sort() : [String(studentAnswer)];
      const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer.map(String).sort() : [String(q.correctAnswer)];
      const isCorrect =
        studentArr.length === correctArr.length &&
        studentArr.every((val, index) => val === correctArr[index]);
      return {
        marksAwarded: isCorrect ? marks : -negMarks,
        autoEvaluated: true,
        isSubjective: false,
      };
    }

    case 'fill_blanks':
    case 'one_word': {
      const studentStr = String(studentAnswer).trim().toLowerCase();
      let isCorrect = false;
      if (Array.isArray(q.correctAnswer)) {
        isCorrect = q.correctAnswer.some((ans) => String(ans).trim().toLowerCase() === studentStr);
      } else {
        isCorrect = String(q.correctAnswer).trim().toLowerCase() === studentStr;
      }
      return {
        marksAwarded: isCorrect ? marks : -negMarks,
        autoEvaluated: true,
        isSubjective: false,
      };
    }

    case 'numerical': {
      const studentNum = Number(studentAnswer);
      const correctNum = Number(q.correctAnswer);
      const tolerance = Number(q.numericalTolerance) || 0;
      const isCorrect = !isNaN(studentNum) && !isNaN(correctNum) && Math.abs(studentNum - correctNum) <= tolerance;
      return {
        marksAwarded: isCorrect ? marks : -negMarks,
        autoEvaluated: true,
        isSubjective: false,
      };
    }

    case 'match_following': {
      const studentPairs = Array.isArray(studentAnswer) ? studentAnswer : [];
      const correctPairs = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
      let matchCount = 0;
      correctPairs.forEach((cp) => {
        const found = studentPairs.find((sp) => sp.left === cp.left && sp.right === cp.right);
        if (found) matchCount++;
      });
      const isFullCorrect = correctPairs.length > 0 && matchCount === correctPairs.length;
      return {
        marksAwarded: isFullCorrect ? marks : matchCount > 0 ? (matchCount / correctPairs.length) * marks : -negMarks,
        autoEvaluated: true,
        isSubjective: false,
      };
    }

    case 'short_answer':
    case 'long_answer':
    case 'case_study':
    case 'passage_based':
    case 'diagram_based':
    case 'image_based':
    default: {
      return {
        marksAwarded: 0,
        autoEvaluated: false,
        isSubjective: true,
      };
    }
  }
};

// -------------------------------------------------------------
// 1. CREATE EXAMINATION
// -------------------------------------------------------------
export const createExam = async (req, res, next) => {
  try {
    const {
      title,
      category,
      academicYear,
      classGrade,
      sections,
      subject,
      description,
      instructions,
      examDate,
      startTime,
      endTime,
      durationMinutes,
      timezone,
      lateStartPolicy,
      autoSubmitAtDeadline,
      resultPublicationMode,
      totalMarks,
      passingMarks,
      negativeMarkingEnabled,
      defaultNegativeMarks,
      partialMarkingEnabled,
      evaluationMethod,
      questionNavigation,
      allowPreviousNavigation,
      randomizeQuestionOrder,
      randomizeOptionOrder,
      questionsPerPage,
      sectionNavigation,
      sectionTimeLimitsEnabled,
      calculatorAllowed,
      reviewBeforeSubmit,
      maxAttempts,
      isPracticeMode,
      tabSwitchLimit,
      examSections,
      blueprint,
      questionPaperId,
    } = req.body;

    if (!title || !classGrade || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Examination title, class, and subject are required',
      });
    }

    let initialSections = examSections && examSections.length > 0
      ? examSections
      : [
          {
            id: 'sec_1',
            title: 'Section A - General',
            description: 'Main questions section',
            durationMinutes: 0,
            totalMarks: totalMarks || 100,
            questions: [],
          },
        ];

    let linkedPaperTitle = '';

    // If a Question Paper was selected, snapshot its questions into the exam sections
    if (questionPaperId) {
      const QuestionPaper = (await import('../models/questionPaperModel.js')).default;
      const qp = await QuestionPaper.findById(questionPaperId);
      if (qp && qp.questions?.length > 0) {
        linkedPaperTitle = qp.title;
        initialSections = [
          {
            id: 'sec_1',
            title: `Section A - ${qp.title}`,
            description: `Questions imported from Question Paper: ${qp.title}`,
            durationMinutes: 0,
            totalMarks: qp.totalMarks || totalMarks || 100,
            questions: qp.questions.map((q, idx) => ({
              questionId: q.questionId ? q.questionId.toString() : (q._id ? q._id.toString() : `qp_${idx + 1}`),
              questionText: q.questionText,
              questionType: q.questionType || 'single_mcq',
              difficulty: q.difficulty || 'medium',
              chapter: q.chapter || '',
              topic: q.topic || '',
              marks: q.marks || 1,
              negativeMarks: q.negativeMarks || 0,
              instructionText: q.instructionText || '',
              passageText: q.passageText || '',
              imageUrl: q.imageUrl || '',
              options: q.options || [],
              correctAnswer: q.correctAnswer,
              explanation: q.explanation || '',
              order: idx,
            })),
          },
        ];
      }
    }

    const exam = await Examination.create({
      title,
      category: category || 'unit_test',
      schoolId: req.user.schoolId || 'SCH-DEFAULT',
      academicYear: academicYear || '2025-2026',
      classGrade,
      sections: Array.isArray(sections) && sections.length > 0 ? sections : ['A'],
      subject,
      description: description || '',
      instructions: instructions || 'Read all questions carefully.',
      createdBy: req.user._id,
      questionPaperId: questionPaperId || null,
      questionPaperTitle: linkedPaperTitle,
      status: 'draft',
      examDate: examDate ? new Date(examDate) : undefined,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      durationMinutes: Number(durationMinutes) || 60,
      timezone: timezone || 'Asia/Kolkata',
      lateStartPolicy: lateStartPolicy || 'allow_with_reduced_time',
      autoSubmitAtDeadline: autoSubmitAtDeadline !== false,
      resultPublicationMode: resultPublicationMode || 'manual',
      totalMarks: Number(totalMarks) || 100,
      passingMarks: Number(passingMarks) || 40,
      negativeMarkingEnabled: !!negativeMarkingEnabled,
      defaultNegativeMarks: Number(defaultNegativeMarks) || 0,
      partialMarkingEnabled: !!partialMarkingEnabled,
      evaluationMethod: evaluationMethod || 'hybrid',
      questionNavigation: questionNavigation || 'free',
      allowPreviousNavigation: allowPreviousNavigation !== false,
      randomizeQuestionOrder: !!randomizeQuestionOrder,
      randomizeOptionOrder: !!randomizeOptionOrder,
      questionsPerPage: Number(questionsPerPage) || 1,
      sectionNavigation: sectionNavigation || 'flexible',
      sectionTimeLimitsEnabled: !!sectionTimeLimitsEnabled,
      calculatorAllowed: !!calculatorAllowed,
      reviewBeforeSubmit: reviewBeforeSubmit !== false,
      maxAttempts: Number(maxAttempts) || 1,
      isPracticeMode: !!isPracticeMode,
      tabSwitchLimit: Number(tabSwitchLimit) || 3,
      examSections: initialSections,
      blueprint: blueprint || {},
    });

    await logAuditEvent(exam._id, req.user._id, req.user.role, 'EXAM_CREATED', { title: exam.title });

    res.status(201).json({
      success: true,
      message: 'Examination created successfully in draft mode',
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 2. GET EXAMS
// -------------------------------------------------------------
export const getExams = async (req, res, next) => {
  try {
    const { status, classGrade, subject, search } = req.query;
    const query = {};

    if (req.user.role === 'student') {
      const studentClass = req.user.studentProfile?.classGrade;
      const studentSection = req.user.studentProfile?.section;

      query.classGrade = studentClass;
      if (studentSection) {
        query.$or = [
          { sections: studentSection },
          { sections: { $size: 0 } },
          { sections: { $exists: false } },
        ];
      }
      query.status = { $in: ['live', 'scheduled', 'published', 'in_progress', 'completed', 'results_published', 'cancelled'] };
    } else if (req.user.role === 'teacher') {
      query.createdBy = req.user._id;
    }

    if (status) query.status = status;
    if (classGrade) query.classGrade = classGrade;
    if (subject) query.subject = subject;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { examCode: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const exams = await Examination.find(query)
      .populate('createdBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .sort({ createdAt: -1 });

    let sanitizedExams = exams;
    if (req.user.role === 'student') {
      sanitizedExams = exams.map((ex) => {
        const obj = ex.toObject();
        if (obj.examSections) {
          obj.examSections.forEach((s) => {
            if (s.questions) {
              s.questions.forEach((q) => {
                delete q.correctAnswer;
                delete q.explanation;
              });
            }
          });
        }
        return obj;
      });
    }

    res.status(200).json({
      success: true,
      count: sanitizedExams.length,
      data: sanitizedExams,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 3. GET SINGLE EXAM BY ID
// -------------------------------------------------------------
export const getExamById = async (req, res, next) => {
  try {
    const exam = await Examination.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('reviewedBy', 'name email role');

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    if (req.user.role === 'student') {
      const studentClass = req.user.studentProfile?.classGrade;
      const studentSection = req.user.studentProfile?.section;

      if (!studentClass || exam.classGrade !== studentClass) {
        return res.status(403).json({
          success: false,
          message: `Access denied: This examination is restricted to ${exam.classGrade}.`,
        });
      }

      if (exam.sections && exam.sections.length > 0 && studentSection) {
        if (!exam.sections.includes(studentSection)) {
          return res.status(403).json({
            success: false,
            message: `Access denied: This examination is not open to Section ${studentSection}.`,
          });
        }
      }

      if (['draft', 'pending_review', 'submitted_for_review', 'under_review', 'rejected'].includes(exam.status)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: This examination has not been released.',
        });
      }
    }

    const examObj = exam.toObject();

    if (req.user.role === 'student') {
      if (examObj.examSections) {
        examObj.examSections.forEach((section) => {
          if (section.questions) {
            section.questions.forEach((q) => {
              delete q.correctAnswer;
              delete q.explanation;
              if (q.matchPairs && Array.isArray(q.matchPairs)) {
                const rightItems = q.matchPairs.map((p) => p.right).sort(() => Math.random() - 0.5);
                q.matchPairs = q.matchPairs.map((p) => ({
                  left: p.left,
                  rightOptions: rightItems,
                }));
              }
            });
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      data: examObj,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 4. UPDATE EXAM
// -------------------------------------------------------------
export const updateExam = async (req, res, next) => {
  try {
    const exam = await Examination.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    if (exam.isSnapshotLocked && req.body.examSections) {
      return res.status(400).json({
        success: false,
        message: 'Question paper is locked because examinations or attempts have already commenced',
      });
    }

    if (req.user.role === 'teacher' && exam.createdBy && exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are only authorized to edit exams you created',
      });
    }

    Object.assign(exam, req.body);
    await exam.save();

    await logAuditEvent(exam._id, req.user._id, req.user.role, 'EXAM_UPDATED', { updatedFields: Object.keys(req.body) });

    res.status(200).json({
      success: true,
      message: 'Examination updated successfully',
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 5. UPDATE QUESTION PAPER
// -------------------------------------------------------------
export const updateQuestionPaper = async (req, res, next) => {
  try {
    const { examSections, totalMarks, passingMarks } = req.body;
    const exam = await Examination.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    if (exam.isSnapshotLocked) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify questions: examination snapshot is locked for ongoing or completed exams',
      });
    }

    if (!Array.isArray(examSections)) {
      return res.status(400).json({
        success: false,
        message: 'examSections must be an array of sections',
      });
    }

    let calculatedTotal = 0;
    let totalQuestionsCount = 0;

    const formattedSections = examSections.map((sec, secIdx) => {
      let secMarks = 0;
      const formattedQs = (sec.questions || []).map((q, qIdx) => {
        const qMarks = Number(q.marks) || 1;
        secMarks += qMarks;
        totalQuestionsCount++;
        return {
          questionId: q.questionId || q._id || `q_${secIdx + 1}_${qIdx + 1}`,
          questionText: q.questionText,
          questionType: q.questionType,
          difficulty: q.difficulty || 'medium',
          chapter: q.chapter || '',
          topic: q.topic || '',
          marks: qMarks,
          negativeMarks: Number(q.negativeMarks) || 0,
          instructionText: q.instructionText || '',
          passageText: q.passageText || '',
          imageUrl: q.imageUrl || '',
          options: q.options || [],
          matchPairs: q.matchPairs || [],
          correctAnswer: q.correctAnswer,
          numericalTolerance: Number(q.numericalTolerance) || 0,
          explanation: q.explanation || '',
          order: q.order !== undefined ? q.order : qIdx + 1,
        };
      });

      calculatedTotal += secMarks;
      return {
        id: sec.id || `sec_${secIdx + 1}`,
        title: sec.title || `Section ${String.fromCharCode(65 + secIdx)}`,
        description: sec.description || '',
        durationMinutes: Number(sec.durationMinutes) || 0,
        totalMarks: secMarks,
        questions: formattedQs,
      };
    });

    exam.examSections = formattedSections;
    exam.totalMarks = Number(totalMarks) || calculatedTotal || exam.totalMarks;
    if (passingMarks) exam.passingMarks = Number(passingMarks);
    exam.version = (exam.version || 1) + 1;

    await exam.save();

    await logAuditEvent(exam._id, req.user._id, req.user.role, 'EXAM_UPDATED', {
      action: 'QUESTION_PAPER_SAVED',
      totalQuestions: totalQuestionsCount,
      calculatedTotalMarks: calculatedTotal,
    });

    res.status(200).json({
      success: true,
      message: 'Question paper saved successfully',
      data: {
        exam,
        totalQuestions: totalQuestionsCount,
        calculatedTotalMarks: calculatedTotal,
      },
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 6. SUBMIT EXAM FOR REVIEW
// -------------------------------------------------------------
export const submitForReview = async (req, res, next) => {
  try {
    const exam = await Examination.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    const questionCount = exam.examSections.reduce((acc, s) => acc + (s.questions?.length || 0), 0);
    if (questionCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot submit an examination paper with 0 questions. Please add questions first.',
      });
    }

    exam.status = 'submitted_for_review';
    await exam.save();

    await logAuditEvent(exam._id, req.user._id, req.user.role, 'PAPER_SUBMITTED_REVIEW');

    res.status(200).json({
      success: true,
      message: 'Question paper submitted for Principal review',
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 7. REVIEW EXAM
// -------------------------------------------------------------
export const reviewExam = async (req, res, next) => {
  try {
    const { action, comments } = req.body;
    const exam = await Examination.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    if (action === 'approve') {
      exam.status = 'approved';
      exam.reviewedBy = req.user._id;
      exam.reviewComments = comments || 'Approved by Principal';
      exam.reviewedAt = new Date();
      await logAuditEvent(exam._id, req.user._id, req.user.role, 'PAPER_APPROVED', { comments });
    } else if (action === 'reject') {
      exam.status = 'rejected';
      exam.reviewedBy = req.user._id;
      exam.reviewComments = comments || 'Changes requested by Principal';
      exam.reviewedAt = new Date();
      await logAuditEvent(exam._id, req.user._id, req.user.role, 'PAPER_REJECTED', { comments });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be approve or reject' });
    }

    await exam.save();

    res.status(200).json({
      success: true,
      message: `Examination paper ${action === 'approve' ? 'approved' : 'returned for revision'}`,
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 8. SCHEDULE, PUBLISH & CANCEL
// -------------------------------------------------------------
export const scheduleExam = async (req, res, next) => {
  try {
    const { examDate, startTime, endTime, durationMinutes, sections } = req.body;
    const exam = await Examination.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    if (req.user.role === 'teacher' && exam.createdBy && exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are only authorized to schedule exams you created',
      });
    }

    const isAdminLevel = ['superadmin', 'principal', 'admin'].includes(req.user.role);
    if (!isAdminLevel && !['approved', 'scheduled', 'published'].includes(exam.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot schedule: examination must be approved first. Current status: ${exam.status}`,
      });
    }

    if (['in_progress', 'completed', 'results_published'].includes(exam.status) || exam.isSnapshotLocked) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reschedule an examination that is already active, locked, or completed',
      });
    }

    const effectiveDate = examDate ? new Date(examDate) : exam.examDate;
    const effectiveStart = startTime ? new Date(startTime) : exam.startTime;
    const effectiveEnd = endTime ? new Date(endTime) : exam.endTime;

    if (!effectiveDate || isNaN(effectiveDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Valid examination date is required' });
    }

    if (!effectiveStart || isNaN(effectiveStart.getTime())) {
      return res.status(400).json({ success: false, message: 'Valid start time is required' });
    }

    if (!effectiveEnd || isNaN(effectiveEnd.getTime())) {
      return res.status(400).json({ success: false, message: 'Valid end time is required' });
    }

    if (effectiveEnd <= effectiveStart) {
      return res.status(400).json({
        success: false,
        message: 'Examination end time must be later than start time',
      });
    }

    const effectiveDuration = durationMinutes ? Number(durationMinutes) : (exam.durationMinutes || 60);
    if (effectiveDuration <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be greater than 0 minutes',
      });
    }

    const isReschedule = ['scheduled', 'published'].includes(exam.status) && (
      (exam.startTime && effectiveStart.getTime() !== exam.startTime.getTime()) ||
      (exam.endTime && effectiveEnd.getTime() !== exam.endTime.getTime()) ||
      (exam.examDate && effectiveDate.getTime() !== exam.examDate.getTime())
    );

    exam.examDate = effectiveDate;
    exam.startTime = effectiveStart;
    exam.endTime = effectiveEnd;
    exam.durationMinutes = effectiveDuration;
    if (sections && Array.isArray(sections) && sections.length > 0) {
      exam.sections = sections;
    }

    exam.status = 'scheduled';
    await exam.save();

    await notifyStudentsExamScheduled(exam, isReschedule);

    await logAuditEvent(exam._id, req.user._id, req.user.role, isReschedule ? 'EXAM_RESCHEDULED' : 'EXAM_SCHEDULED', {
      examDate: exam.examDate,
      startTime: exam.startTime,
      endTime: exam.endTime,
      durationMinutes: exam.durationMinutes,
      sections: exam.sections,
    });

    res.status(200).json({
      success: true,
      message: isReschedule ? 'Examination rescheduled successfully' : 'Examination scheduled successfully',
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

export const publishExam = async (req, res, next) => {
  try {
    const exam = await Examination.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    if (req.user.role === 'teacher' && exam.createdBy && exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to publish this exam' });
    }

    if (['in_progress', 'completed', 'results_published'].includes(exam.status)) {
      return res.status(400).json({ success: false, message: 'Cannot modify an ongoing or completed exam' });
    }

    const questionCount = exam.examSections.reduce((acc, s) => acc + (s.questions?.length || 0), 0);
    if (questionCount === 0) {
      return res.status(400).json({ success: false, message: 'Cannot publish an exam with 0 questions' });
    }

    exam.status = 'published';
    await exam.save();

    await notifyStudentsExamScheduled(exam, false);
    await logAuditEvent(exam._id, req.user._id, req.user.role, 'EXAM_PUBLISHED');

    res.status(200).json({
      success: true,
      message: 'Examination published successfully and visible to eligible students',
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelExam = async (req, res, next) => {
  try {
    const exam = await Examination.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    if (req.user.role === 'teacher' && exam.createdBy && exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to cancel this exam' });
    }

    if (['completed', 'results_published'].includes(exam.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel an already completed examination' });
    }

    exam.status = 'cancelled';
    await exam.save();

    await notifyStudentsExamCancelled(exam);
    await logAuditEvent(exam._id, req.user._id, req.user.role, 'EXAM_CANCELLED');

    res.status(200).json({
      success: true,
      message: 'Examination cancelled and eligible students notified',
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 8B. GO LIVE — ATOMIC EXAM ACTIVATION
// -------------------------------------------------------------
export const goLiveExam = async (req, res, next) => {
  try {
    const examId = req.params.id || req.params.examId;
    const exam = await Examination.findById(examId);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    if (req.user.role === 'teacher' && exam.createdBy && exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are only authorized to launch examinations you created',
      });
    }

    if (exam.status === 'live' || exam.status === 'in_progress') {
      return res.status(200).json({
        success: true,
        message: 'Examination is already LIVE and running',
        data: exam,
      });
    }

    const approvedStatuses = ['approved', 'scheduled', 'ready_to_launch'];
    if (!approvedStatuses.includes(exam.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot go live: Examination must be approved first. Current status: ${exam.status}`,
      });
    }

    const questionCount = (exam.examSections || []).reduce((acc, s) => acc + (s.questions?.length || 0), 0);
    if (questionCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot launch examination with 0 questions in paper',
      });
    }

    const serverNow = new Date();
    exam.previousStatus = exam.status;
    exam.status = 'live';
    exam.actualLaunchTime = serverNow;
    exam.launchedBy = req.user._id;
    exam.isSnapshotLocked = true;

    await exam.save();

    await notifyStudentsExamGoLive(exam);

    await logAuditEvent(exam._id, req.user._id, req.user.role, 'EXAM_GO_LIVE', {
      launchedAt: serverNow,
      previousStatus: exam.previousStatus,
    });

    try {
      emitExamMonitorUpdate(exam._id.toString(), {
        event: 'exam_live',
        examId: exam._id,
        status: 'live',
        actualLaunchTime: serverNow,
      });
    } catch (e) {}

    res.status(200).json({
      success: true,
      message: `Examination "${exam.title}" is now LIVE! Eligible students have been notified.`,
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 8C. PAUSE EXAM
// -------------------------------------------------------------
export const pauseExam = async (req, res, next) => {
  try {
    const examId = req.params.id || req.params.examId;
    const { reason } = req.body;
    const exam = await Examination.findById(examId);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    if (req.user.role === 'teacher' && exam.createdBy && exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (exam.status !== 'live' && exam.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: `Cannot pause examination that is not LIVE. Current status: ${exam.status}`,
      });
    }

    exam.previousStatus = exam.status;
    exam.status = 'paused';
    exam.pausedAt = new Date();
    exam.pauseReason = reason || 'Technical maintenance / Faculty pause';
    await exam.save();

    await notifyStudentsExamPaused(exam, reason);
    await logAuditEvent(exam._id, req.user._id, req.user.role, 'EXAM_PAUSED', { reason });

    try {
      emitExamMonitorUpdate(exam._id.toString(), {
        event: 'exam_paused',
        examId: exam._id,
        status: 'paused',
        reason,
      });
    } catch (e) {}

    res.status(200).json({
      success: true,
      message: 'Examination paused successfully',
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 8D. RESUME EXAM
// -------------------------------------------------------------
export const resumeExam = async (req, res, next) => {
  try {
    const examId = req.params.id || req.params.examId;
    const exam = await Examination.findById(examId);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    if (req.user.role === 'teacher' && exam.createdBy && exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (exam.status !== 'paused') {
      return res.status(400).json({
        success: false,
        message: `Cannot resume examination that is not paused. Current status: ${exam.status}`,
      });
    }

    const serverNow = new Date();
    const pausedDurationMs = exam.pausedAt ? serverNow.getTime() - new Date(exam.pausedAt).getTime() : 0;
    exam.totalPausedDurationMs = (exam.totalPausedDurationMs || 0) + pausedDurationMs;

    if (pausedDurationMs > 0) {
      const activeAttempts = await ExaminationAttempt.find({ examination: exam._id, status: 'in_progress' });
      for (const att of activeAttempts) {
        if (att.deadline) {
          att.deadline = new Date(new Date(att.deadline).getTime() + pausedDurationMs);
          await att.save();
        }
      }
    }

    exam.previousStatus = 'paused';
    exam.status = 'live';
    exam.pausedAt = null;
    await exam.save();

    await notifyStudentsExamResumed(exam);
    await logAuditEvent(exam._id, req.user._id, req.user.role, 'EXAM_RESUMED', {
      pausedDurationSeconds: Math.round(pausedDurationMs / 1000),
    });

    try {
      emitExamMonitorUpdate(exam._id.toString(), {
        event: 'exam_resumed',
        examId: exam._id,
        status: 'live',
      });
    } catch (e) {}

    res.status(200).json({
      success: true,
      message: 'Examination resumed successfully and student timers extended',
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 8E. END EXAM
// -------------------------------------------------------------
export const endExam = async (req, res, next) => {
  try {
    const examId = req.params.id || req.params.examId;
    const exam = await Examination.findById(examId);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    if (req.user.role === 'teacher' && exam.createdBy && exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!['live', 'in_progress', 'paused'].includes(exam.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot end examination with status "${exam.status}"`,
      });
    }

    const serverNow = new Date();
    exam.previousStatus = exam.status;
    exam.status = 'completed';
    exam.actualEndTime = serverNow;
    await exam.save();

    const inProgressAttempts = await ExaminationAttempt.find({
      examination: exam._id,
      status: 'in_progress',
    });

    for (const att of inProgressAttempts) {
      att.status = 'submitted';
      att.submittedAt = serverNow;
      att.submissionType = 'admin_forced';
      await att.save();
    }

    await notifyStudentsExamEnded(exam);
    await logAuditEvent(exam._id, req.user._id, req.user.role, 'EXAM_ENDED', {
      endedAt: serverNow,
      autoSubmittedCount: inProgressAttempts.length,
    });

    try {
      emitExamMonitorUpdate(exam._id.toString(), {
        event: 'exam_ended',
        examId: exam._id,
        status: 'completed',
      });
    } catch (e) {}

    res.status(200).json({
      success: true,
      message: `Examination concluded successfully. ${inProgressAttempts.length} active student attempt(s) were finalized.`,
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 9. START OR RESUME ATTEMPT
// -------------------------------------------------------------
export const startExamAttempt = async (req, res, next) => {
  try {
    const exam = await Examination.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    if (exam.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This examination has been cancelled and cannot be started',
      });
    }

    if (exam.status === 'paused') {
      return res.status(400).json({
        success: false,
        message: 'This examination is currently paused by faculty. Please stand by.',
      });
    }

    if (['completed', 'results_published', 'expired'].includes(exam.status)) {
      return res.status(400).json({
        success: false,
        message: 'This examination has already concluded.',
      });
    }

    if (['draft', 'submitted_for_review', 'under_review', 'rejected'].includes(exam.status)) {
      return res.status(400).json({
        success: false,
        message: 'This examination has not yet been approved or scheduled',
      });
    }

    const serverNowCheck = new Date();
    const isLive = exam.status === 'live' || exam.status === 'in_progress';
    if (!isLive && !exam.isPracticeMode) {
      if (exam.startTime && serverNowCheck < new Date(exam.startTime)) {
        return res.status(400).json({
          success: false,
          message: `This examination is scheduled to start at ${new Date(exam.startTime).toLocaleString()}`,
        });
      }
    }

    const studentClass = req.user.studentProfile?.classGrade;
    const studentSection = req.user.studentProfile?.section;

    if (!studentClass || exam.classGrade !== studentClass) {
      return res.status(403).json({
        success: false,
        message: `This examination is configured for ${exam.classGrade}, but your profile is registered under ${studentClass || 'an unassigned class'}`,
      });
    }

    if (exam.sections && exam.sections.length > 0 && studentSection) {
      if (!exam.sections.includes(studentSection)) {
        return res.status(403).json({
          success: false,
          message: `Your section (${studentSection}) is not included in the eligible sections for this exam`,
        });
      }
    }

    const existingAttempts = await ExaminationAttempt.find({
      student: req.user._id,
      examination: exam._id,
    }).sort({ attemptNumber: -1 });

    const activeAttempt = existingAttempts.find((att) => att.status === 'in_progress');

    if (activeAttempt) {
      const serverNow = new Date();
      if (serverNow > activeAttempt.deadline) {
        activeAttempt.status = 'auto_submitted';
        activeAttempt.submittedAt = serverNow;
        activeAttempt.submissionType = 'auto_timeout';
        await activeAttempt.save();

        return res.status(400).json({
          success: false,
          message: 'The examination time limit has expired while away.',
        });
      }

      const sanitizedExam = exam.toObject();
      (sanitizedExam.examSections || []).forEach((s) =>
        (s.questions || []).forEach((q) => {
          delete q.correctAnswer;
          delete q.explanation;
        })
      );

      await logAuditEvent(exam._id, req.user._id, req.user.role, 'ATTEMPT_RESUMED', {
        attemptId: activeAttempt._id,
      });

      return res.status(200).json({
        success: true,
        message: 'Resuming active examination attempt',
        data: {
          attempt: activeAttempt,
          exam: sanitizedExam,
          serverTime: serverNow,
          timeRemainingSeconds: Math.max(0, Math.floor((activeAttempt.deadline - serverNow) / 1000)),
        },
      });
    }

    const completedAttempts = existingAttempts.filter((att) =>
      ['submitted', 'auto_submitted', 'evaluation_pending', 'evaluated', 'result_published'].includes(att.status)
    );

    if (!exam.isPracticeMode && completedAttempts.length >= (exam.maxAttempts || 1)) {
      return res.status(403).json({
        success: false,
        message: `You have exhausted the maximum allowed attempts (${exam.maxAttempts || 1}) for this examination`,
      });
    }

    const serverNow = new Date();
    const durationMs = (exam.durationMinutes || 60) * 60 * 1000;
    let deadline = new Date(serverNow.getTime() + durationMs);

    if (exam.endTime && exam.endTime < deadline) {
      deadline = new Date(exam.endTime);
    }

    const initialAnswers = [];
    (exam.examSections || []).forEach((section, sIdx) => {
      (section.questions || []).forEach((q, qIdx) => {
        const qId = getQuestionId(q, `q_${section.id || sIdx}_${qIdx}`);
        initialAnswers.push({
          questionId: qId,
          sectionId: section.id || `sec_${sIdx + 1}`,
          questionType: q?.questionType || 'single_mcq',
          studentAnswer: null,
          isAnswered: false,
          isMarkedForReview: false,
          visited: false,
          lastSavedAt: serverNow,
          marksAwarded: 0,
          autoEvaluated: false,
          isEvaluated: false,
        });
      });
    });

    const newAttempt = await ExaminationAttempt.create({
      student: req.user._id,
      examination: exam._id,
      attemptNumber: completedAttempts.length + 1,
      examVersion: exam.version || 1,
      startedAt: serverNow,
      deadline,
      status: 'in_progress',
      answers: initialAnswers,
      score: {
        maxMarks: exam.totalMarks,
        totalScore: 0,
        percentage: 0,
        isPassed: false,
      },
    });

    if (!exam.isSnapshotLocked) {
      exam.isSnapshotLocked = true;
      if (exam.status === 'scheduled') {
        exam.status = 'in_progress';
      }
      await exam.save();
    }

    await logAuditEvent(exam._id, req.user._id, req.user.role, 'ATTEMPT_STARTED', {
      attemptId: newAttempt._id,
      attemptNumber: newAttempt.attemptNumber,
    });

    const sanitizedExam = exam.toObject();
    (sanitizedExam.examSections || []).forEach((s) =>
      (s.questions || []).forEach((q) => {
        delete q.correctAnswer;
        delete q.explanation;
      })
    );

    res.status(201).json({
      success: true,
      message: 'Examination started successfully',
      data: {
        attempt: newAttempt,
        exam: sanitizedExam,
        serverTime: serverNow,
        timeRemainingSeconds: Math.max(0, Math.floor((deadline - serverNow) / 1000)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 10. SAVE STUDENT ANSWER (Body Payload)
// -------------------------------------------------------------
export const saveStudentAnswer = async (req, res, next) => {
  try {
    const { attemptId, questionId, studentAnswer, isMarkedForReview, visited } = req.body;

    const attempt = await ExaminationAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Examination attempt not found' });
    }

    if (attempt.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized attempt access' });
    }

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Cannot save response: this examination attempt is no longer in progress',
      });
    }

    const serverNow = new Date();
    if (serverNow > attempt.deadline) {
      attempt.status = 'auto_submitted';
      attempt.submittedAt = serverNow;
      attempt.submissionType = 'auto_timeout';
      await attempt.save();

      return res.status(400).json({
        success: false,
        isExpired: true,
        message: 'Exam timeout expired. Attempt has been auto-submitted.',
      });
    }

    let answerSlot = attempt.answers.find((a) => a.questionId === String(questionId));
    const isAnswered = studentAnswer !== undefined && studentAnswer !== null && studentAnswer !== '';

    if (answerSlot) {
      answerSlot.studentAnswer = studentAnswer;
      answerSlot.isAnswered = isAnswered;
      if (isMarkedForReview !== undefined) answerSlot.isMarkedForReview = isMarkedForReview;
      if (visited !== undefined) answerSlot.visited = visited;
      answerSlot.lastSavedAt = serverNow;
    } else {
      attempt.answers.push({
        questionId: String(questionId),
        sectionId: 'sec_1',
        questionType: 'single_mcq',
        studentAnswer,
        isAnswered,
        isMarkedForReview: !!isMarkedForReview,
        visited: true,
        lastSavedAt: serverNow,
      });
    }

    await attempt.save();

    res.status(200).json({
      success: true,
      message: 'Response saved successfully',
      lastSavedAt: serverNow,
      timeRemainingSeconds: Math.max(0, Math.floor((attempt.deadline - serverNow) / 1000)),
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 10B. SAVE STUDENT ANSWER (Direct Route: PUT /attempts/:attemptId/answers/:questionId)
// -------------------------------------------------------------
export const saveAttemptAnswerDirect = async (req, res, next) => {
  try {
    const { attemptId, questionId } = req.params;
    const { studentAnswer, isMarkedForReview, visited, questionType } = req.body;

    const attempt = await ExaminationAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Examination attempt not found' });
    }

    if (attempt.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized attempt access' });
    }

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Cannot save response: this examination attempt is no longer in progress',
      });
    }

    const serverNow = new Date();
    if (serverNow > attempt.deadline) {
      attempt.status = 'auto_submitted';
      attempt.submittedAt = serverNow;
      attempt.submissionType = 'auto_timeout';
      await attempt.save();

      return res.status(400).json({
        success: false,
        isExpired: true,
        message: 'Exam timeout expired. Attempt has been auto-submitted.',
      });
    }

    let answerSlot = attempt.answers.find((a) => a.questionId === String(questionId));
    const isAnswered = studentAnswer !== undefined && studentAnswer !== null && studentAnswer !== '';

    if (answerSlot) {
      answerSlot.studentAnswer = studentAnswer;
      answerSlot.isAnswered = isAnswered;
      if (isMarkedForReview !== undefined) answerSlot.isMarkedForReview = isMarkedForReview;
      if (visited !== undefined) answerSlot.visited = visited;
      answerSlot.lastSavedAt = serverNow;
    } else {
      attempt.answers.push({
        questionId: String(questionId),
        sectionId: 'sec_1',
        questionType: questionType || 'single_mcq',
        studentAnswer,
        isAnswered,
        isMarkedForReview: !!isMarkedForReview,
        visited: true,
        lastSavedAt: serverNow,
      });
    }

    await attempt.save();

    res.status(200).json({
      success: true,
      message: 'Response saved successfully',
      lastSavedAt: serverNow,
      timeRemainingSeconds: Math.max(0, Math.floor((attempt.deadline - serverNow) / 1000)),
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 10C. HEARTBEAT KEEP-ALIVE (POST /attempts/:attemptId/heartbeat)
// -------------------------------------------------------------
export const attemptHeartbeat = async (req, res, next) => {
  try {
    const attemptId = req.params.attemptId || req.body.attemptId;
    const attempt = await ExaminationAttempt.findById(attemptId);

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Examination attempt not found' });
    }

    const serverNow = new Date();

    if (attempt.status !== 'in_progress') {
      return res.status(200).json({
        success: false,
        status: attempt.status,
        isCompleted: true,
        message: 'Attempt is no longer in progress',
      });
    }

    if (serverNow > attempt.deadline) {
      attempt.status = 'auto_submitted';
      attempt.submittedAt = serverNow;
      attempt.submissionType = 'auto_timeout';
      await attempt.save();

      return res.status(200).json({
        success: false,
        isExpired: true,
        status: 'auto_submitted',
        timeRemainingSeconds: 0,
        message: 'Exam timeout expired',
      });
    }

    attempt.lastHeartbeat = serverNow;
    await attempt.save();

    const timeRemainingSeconds = Math.max(0, Math.floor((attempt.deadline - serverNow) / 1000));

    res.status(200).json({
      success: true,
      serverTime: serverNow,
      timeRemainingSeconds,
      status: attempt.status,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 11. RECORD TAB SWITCH & LOG VIOLATION (ANTI-CHEAT)
// -------------------------------------------------------------
export const recordTabSwitch = async (req, res, next) => {
  try {
    const { attemptId, reason } = req.body;
    const attempt = await ExaminationAttempt.findById(attemptId);

    if (attempt && attempt.status === 'in_progress') {
      attempt.tabSwitchesCount = (attempt.tabSwitchesCount || 0) + 1;
      if (!Array.isArray(attempt.tabSwitchLogs)) {
        attempt.tabSwitchLogs = [];
      }
      attempt.tabSwitchLogs.push({
        timestamp: new Date(),
        reason: reason || 'Focus lost: Tab switch or window blur',
      });
      attempt.lastHeartbeat = new Date();
      await attempt.save();

      await logAuditEvent(attempt.examination, req.user._id, req.user.role, 'TAB_SWITCH_RECORDED', {
        tabSwitchesCount: attempt.tabSwitchesCount,
        reason,
      });
    }

    res.status(200).json({
      success: true,
      tabSwitchesCount: attempt ? attempt.tabSwitchesCount : 0,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 11B. LOG ATTEMPT VIOLATION (Phase 8 Anti-Cheat Endpoint)
// -------------------------------------------------------------
export const logAttemptViolation = async (req, res, next) => {
  try {
    const attemptId = req.params.attemptId || req.body.attemptId;
    const { type, reason, deviceInfo } = req.body;

    if (!attemptId || !mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ success: false, message: 'Invalid attempt ID' });
    }

    const attempt = await ExaminationAttempt.findById(attemptId).populate('examination student');
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (attempt.status !== 'in_progress') {
      return res.status(200).json({
        success: false,
        message: 'Attempt is no longer in progress',
        status: attempt.status,
      });
    }

    const exam = attempt.examination;
    const maxAllowedWarnings = exam?.maxWarnings || 3;

    attempt.tabSwitchesCount = (attempt.tabSwitchesCount || 0) + 1;
    const currentWarningNumber = attempt.tabSwitchesCount;

    const ViolationLog = (await import('../models/violationLogModel.js')).default;
    await ViolationLog.create({
      attempt: attempt._id,
      student: attempt.student._id,
      examination: exam._id,
      type: type || 'tab_switch',
      reason: reason || 'Anti-cheat breach detected',
      warningNumber: currentWarningNumber,
      maxWarnings: maxAllowedWarnings,
      deviceInfo: deviceInfo || {},
      timestamp: new Date(),
    });

    let autoSubmitted = false;
    if (currentWarningNumber >= maxAllowedWarnings) {
      attempt.status = 'auto_submitted';
      attempt.submittedAt = new Date();
      attempt.submissionType = 'auto_submitted_violation';
      autoSubmitted = true;
    }

    attempt.lastHeartbeat = new Date();
    await attempt.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`exam_${exam._id}`).emit('student_violation', {
        attemptId: attempt._id,
        studentId: attempt.student._id,
        studentName: attempt.student.name,
        rollNumber: attempt.student.studentProfile?.rollNumber || '',
        warningNumber: currentWarningNumber,
        maxWarnings: maxAllowedWarnings,
        violationType: type,
        autoSubmitted,
        timestamp: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      warningCount: currentWarningNumber,
      maxWarnings: maxAllowedWarnings,
      autoSubmitted,
      message: autoSubmitted
        ? 'Maximum warnings exceeded. Examination has been automatically submitted.'
        : `Warning ${currentWarningNumber} of ${maxAllowedWarnings} recorded.`,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 12. SUBMIT EXAMINATION ATTEMPT (Idempotent + Atomic Save)
// -------------------------------------------------------------
export const submitExamAttempt = async (req, res, next) => {
  try {
    const attemptId = req.body.attemptId || req.params.attemptId || req.body.id;
    const submissionType = req.body.submissionType || 'manual';

    if (!attemptId) {
      return res.status(400).json({
        success: false,
        field: 'attemptId',
        message: 'Missing attempt ID. Please provide attemptId in the request body.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({
        success: false,
        field: 'attemptId',
        message: 'Invalid attempt ID format.',
      });
    }

    const attempt = await ExaminationAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Examination attempt not found for the provided ID.',
      });
    }

    if (
      attempt.student.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      req.user.role !== 'superadmin' &&
      req.user.role !== 'principal'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only submit your own examination attempt.',
      });
    }

    const exam = await Examination.findById(attempt.examination);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Associated examination record not found' });
    }

    // IDEMPOTENCY: If already submitted, return existing state with success=true
    if (['submitted', 'auto_submitted', 'evaluation_pending', 'evaluated', 'result_published'].includes(attempt.status)) {
      return res.status(200).json({
        success: true,
        isAlreadySubmitted: true,
        message: 'Examination attempt is already submitted.',
        data: {
          attemptId: attempt._id,
          status: attempt.status,
          submittedAt: attempt.submittedAt,
          autoScore: attempt.score?.autoScore || 0,
          maxMarks: exam.totalMarks,
        },
      });
    }

    const serverNow = new Date();
    attempt.submittedAt = serverNow;
    attempt.submissionType = submissionType;

    let autoScore = 0;
    let hasSubjectiveQuestions = false;
    const sectionScores = {};

    (exam.examSections || []).forEach((sec, sIdx) => {
      const sId = sec.id || `sec_${sIdx + 1}`;
      sectionScores[sId] = {
        sectionId: sId,
        title: sec.title || `Section ${sIdx + 1}`,
        marksObtained: 0,
        maxMarks: sec.totalMarks || 0,
      };

      (sec.questions || []).forEach((q, qIdx) => {
        const qId = getQuestionId(q, `q_${sId}_${qIdx}`);
        const ansSlot = attempt.answers.find((a) => a.questionId === qId);

        const evalResult = autoEvaluateQuestion(
          q,
          ansSlot ? ansSlot.studentAnswer : null,
          exam.negativeMarkingEnabled,
          exam.defaultNegativeMarks
        );

        if (ansSlot) {
          ansSlot.autoEvaluated = evalResult.autoEvaluated;
          ansSlot.marksAwarded = evalResult.marksAwarded;
          ansSlot.isEvaluated = evalResult.autoEvaluated;
        }

        if (evalResult.isSubjective) {
          hasSubjectiveQuestions = true;
        } else {
          autoScore += evalResult.marksAwarded;
          if (sectionScores[sId]) {
            sectionScores[sId].marksObtained += evalResult.marksAwarded;
          }
        }
      });
    });

    attempt.score.autoScore = Math.max(0, autoScore);
    attempt.score.totalScore = Math.max(0, autoScore);
    attempt.score.maxMarks = exam.totalMarks;
    attempt.score.percentage = exam.totalMarks > 0 ? (attempt.score.totalScore / exam.totalMarks) * 100 : 0;
    attempt.score.isPassed = attempt.score.totalScore >= exam.passingMarks;
    attempt.score.sectionWiseScores = Object.values(sectionScores);

    // Default: submitted state awaiting teacher review/approval
    if (hasSubjectiveQuestions) {
      attempt.status = 'evaluation_pending';
    } else {
      attempt.status = 'submitted';
    }

    if (exam.resultPublicationMode === 'immediate') {
      attempt.isResultPublished = true;
      attempt.resultPublishedAt = serverNow;
    }

    // Atomic update avoids Mongoose VersionError from background heartbeats/violations
    await ExaminationAttempt.findByIdAndUpdate(
      attempt._id,
      {
        $set: {
          submittedAt: serverNow,
          submissionType: submissionType,
          status: attempt.status,
          score: attempt.score,
          answers: attempt.answers,
          isResultPublished: attempt.isResultPublished,
          resultPublishedAt: attempt.resultPublishedAt,
        },
      },
      { new: true }
    );

    await logAuditEvent(exam._id, req.user._id, req.user.role, 'EXAM_SUBMITTED', {
      submissionType,
      autoScore,
      hasSubjectiveQuestions,
    });

    // Notify teacher safely (failure won't crash submission response)
    if (exam.createdBy) {
      try {
        await createNotification({
          recipient: exam.createdBy,
          type: 'exam_submitted_successfully',
          title: `Exam Submitted: ${req.user.name}`,
          message: `${req.user.name} (${req.user.studentProfile?.rollNumber || 'Student'}) submitted their attempt for ${exam.title}.`,
          link: `/exams/${exam._id}/evaluations`,
          examination: exam,
        });
      } catch (notifErr) {
        console.warn('[Notification] Failed to send teacher submit notification:', notifErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Examination submitted successfully.',
      data: {
        attemptId: attempt._id,
        status: attempt.status,
        submittedAt: attempt.submittedAt,
        autoScore: attempt.score.autoScore,
        maxMarks: exam.totalMarks,
        isResultPublished: attempt.isResultPublished,
      },
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 13. RESET ATTEMPTS
// -------------------------------------------------------------
export const resetStudentAttempts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const targetStudentId = req.body.studentId || req.user._id;

    const result = await ExaminationAttempt.deleteMany({
      examination: id,
      student: targetStudentId,
    });

    await logAuditEvent(id, req.user._id, req.user.role, 'ATTEMPTS_RESET', {
      targetStudentId,
      deletedCount: result.deletedCount,
    });

    res.status(200).json({
      success: true,
      message: `Reset successful: ${result.deletedCount} attempt(s) removed. You can now retake the exam.`,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 14. GET SUBMISSIONS FOR TEACHER / PRINCIPAL EVALUATION
// -------------------------------------------------------------
export const getExamSubmissions = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const exam = await Examination.findById(examId);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    const submissions = await ExaminationAttempt.find({ examination: examId })
      .populate('student', 'name email schoolId studentProfile')
      .populate('evaluatedBy', 'name email role')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 15. GET SINGLE ATTEMPT FOR EVALUATION
// -------------------------------------------------------------
export const getAttemptForEvaluation = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const attempt = await ExaminationAttempt.findById(attemptId)
      .populate('student', 'name email schoolId studentProfile')
      .populate('examination');

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    res.status(200).json({
      success: true,
      data: attempt,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 16. SAVE MANUAL EVALUATION
// -------------------------------------------------------------
export const saveManualEvaluation = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { evaluations, evaluationNotes } = req.body;

    const attempt = await ExaminationAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    const exam = await Examination.findById(attempt.examination);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam record not found' });
    }

    let manualScore = 0;

    (evaluations || []).forEach((item) => {
      const slot = attempt.answers.find((a) => a.questionId === item.questionId);
      if (slot) {
        slot.marksAwarded = Number(item.marksAwarded) || 0;
        slot.evaluatorFeedback = item.feedback || '';
        slot.evaluationComment = item.comment || '';
        slot.isEvaluated = true;
      }
      manualScore += Number(item.marksAwarded) || 0;
    });

    attempt.score.manualScore = manualScore;
    attempt.score.totalScore = (attempt.score.autoScore || 0) + manualScore;
    attempt.score.percentage = exam.totalMarks > 0 ? (attempt.score.totalScore / exam.totalMarks) * 100 : 0;
    attempt.score.isPassed = attempt.score.totalScore >= exam.passingMarks;

    attempt.evaluatedBy = req.user._id;
    attempt.evaluatedAt = new Date();
    attempt.evaluationNotes = evaluationNotes || '';
    attempt.status = 'evaluated';

    await attempt.save();

    await logAuditEvent(exam._id, req.user._id, req.user.role, 'MANUAL_EVALUATION_SAVED', {
      attemptId: attempt._id,
      manualScore,
      totalScore: attempt.score.totalScore,
    });

    res.status(200).json({
      success: true,
      message: 'Evaluation saved successfully',
      data: attempt,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 17. TOGGLE PUBLISH RESULTS
// -------------------------------------------------------------
export const togglePublishResults = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { publish = true } = req.body;

    const exam = await Examination.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    exam.status = publish ? 'results_published' : 'completed';
    exam.resultPublicationDate = publish ? new Date() : null;
    await exam.save();

    await ExaminationAttempt.updateMany(
      { examination: examId, status: { $in: ['evaluated', 'submitted', 'auto_submitted', 'evaluation_pending', 'result_published'] } },
      {
        $set: {
          isResultPublished: publish,
          resultPublishedAt: publish ? new Date() : null,
          status: publish ? 'result_published' : 'evaluated',
        },
      }
    );

    if (publish) {
      await notifyStudentsResultsPublished(exam);
    }

    await logAuditEvent(
      exam._id,
      req.user._id,
      req.user.role,
      publish ? 'RESULTS_PUBLISHED' : 'RESULTS_UNPUBLISHED'
    );

    res.status(200).json({
      success: true,
      message: `Examination results ${publish ? 'officially published' : 'hidden'}`,
      isPublished: publish,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 18. GET EXAM ANALYTICS DASHBOARD
// -------------------------------------------------------------
export const getExamAnalytics = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const exam = await Examination.findById(examId);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    // Role check: Teacher can view analytics for exams they created or classes they teach
    if (req.user.role === 'teacher') {
      const isOwner = exam.createdBy.toString() === req.user._id.toString();
      const isAssigned = (req.user.teacherProfile?.assignedClasses || []).includes(exam.classGrade);
      if (!isOwner && !isAssigned) {
        return res.status(403).json({ success: false, message: 'Access denied: You do not teach this exam’s class' });
      }
    } else if (req.user.role === 'student') {
      return res.status(403).json({ success: false, message: 'Access denied: Students cannot access staff exam analytics' });
    }

    const studentQuery = { role: 'student', 'studentProfile.classGrade': exam.classGrade };
    if (exam.sections && exam.sections.length > 0) {
      studentQuery['studentProfile.section'] = { $in: exam.sections };
    }
    const totalEligible = await User.countDocuments(studentQuery);

    const attempts = await ExaminationAttempt.find({ examination: examId })
      .populate('student', 'name email schoolId studentProfile')
      .sort({ 'score.totalScore': -1 });

    const submittedAttempts = attempts.filter((a) =>
      ['submitted', 'auto_submitted', 'evaluation_pending', 'evaluated', 'result_published'].includes(a.status)
    );

    const scores = submittedAttempts.map((a) => a.score.totalScore || 0);
    const passedCount = submittedAttempts.filter((a) => a.score.isPassed).length;
    const failedCount = submittedAttempts.length - passedCount;

    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
    const averageScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
    const passPercentage = submittedAttempts.length > 0 ? ((passedCount / submittedAttempts.length) * 100).toFixed(1) : 0;

    const questionPerformance = [];
    (exam.examSections || []).forEach((sec, sIdx) => {
      (sec.questions || []).forEach((q, qIdx) => {
        const qId = getQuestionId(q, `q_${sec.id || sIdx}_${qIdx}`);
        let totalAttempted = 0;
        let correctCount = 0;

        submittedAttempts.forEach((att) => {
          const ans = (att.answers || []).find((a) => a.questionId === qId);
          if (ans && ans.isAnswered) {
            totalAttempted++;
            if (ans.marksAwarded > 0) correctCount++;
          }
        });

        questionPerformance.push({
          questionId: qId,
          sectionTitle: sec.title,
          questionText: q?.questionText || '',
          questionType: q?.questionType || '',
          marks: q?.marks || 0,
          totalAttempted,
          correctCount,
          accuracyRate: totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0,
        });
      });
    });

    res.status(200).json({
      success: true,
      data: {
        exam,
        summary: {
          totalEligible,
          totalStarted: attempts.length,
          totalSubmitted: submittedAttempts.length,
          absentCount: Math.max(0, totalEligible - attempts.length),
          passedCount,
          failedCount,
          passPercentage: Number(passPercentage),
          averageScore: Number(averageScore),
          highestScore,
          lowestScore,
          maxMarks: exam.totalMarks,
        },
        questionPerformance,
        candidateRankings: submittedAttempts.map((att, idx) => ({
          rank: idx + 1,
          studentName: att.student?.name || 'Student',
          schoolId: att.student?.schoolId || '',
          rollNumber: att.student?.studentProfile?.rollNumber || '',
          score: att.score.totalScore,
          percentage: Number(att.score.percentage.toFixed(1)),
          isPassed: att.score.isPassed,
          submittedAt: att.submittedAt,
          status: att.status,
          attemptId: att._id,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 19. GET STUDENT RESULT
// -------------------------------------------------------------
export const getStudentResult = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const studentId = req.query.studentId && ['admin', 'superadmin', 'teacher'].includes(req.user.role)
      ? req.query.studentId
      : req.user._id;

    const exam = await Examination.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    const attempt = await ExaminationAttempt.findOne({
      examination: examId,
      student: studentId,
    })
      .populate('student', 'name email schoolId studentProfile')
      .populate('evaluatedBy', 'name');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'No examination attempt found for this student',
      });
    }

    if (req.user.role === 'student' && !attempt.isResultPublished && !exam.isPracticeMode) {
      return res.status(200).json({
        success: true,
        isPublished: false,
        message: 'Examination results have not been officially published yet. Please check back later.',
        data: {
          examTitle: exam.title,
          examCode: exam.examCode,
          subject: exam.subject,
          submittedAt: attempt.submittedAt,
          status: 'evaluation_pending',
        },
      });
    }

    const detailedReview = [];
    (exam.examSections || []).forEach((sec, sIdx) => {
      (sec.questions || []).forEach((q, qIdx) => {
        const qId = getQuestionId(q, `q_${sec.id || sIdx}_${qIdx}`);
        const ansSlot = (attempt.answers || []).find((a) => a.questionId === qId);

        detailedReview.push({
          questionId: qId,
          sectionTitle: sec.title,
          questionText: q?.questionText || '',
          questionType: q?.questionType || '',
          marks: q?.marks || 0,
          options: q?.options || [],
          matchPairs: q?.matchPairs || [],
          passageText: q?.passageText || '',
          imageUrl: q?.imageUrl || '',
          studentAnswer: ansSlot ? ansSlot.studentAnswer : null,
          isAnswered: ansSlot ? ansSlot.isAnswered : false,
          correctAnswer: q?.correctAnswer,
          explanation: q?.explanation,
          marksAwarded: ansSlot ? ansSlot.marksAwarded : 0,
          evaluatorFeedback: ansSlot ? ansSlot.evaluatorFeedback : '',
        });
      });
    });

    res.status(200).json({
      success: true,
      isPublished: true,
      data: {
        exam,
        attempt,
        detailedReview,
      },
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 20. GET LIVE EXAM MONITOR
// -------------------------------------------------------------
export const getExamMonitor = async (req, res, next) => {
  try {
    const examId = req.params.examId || req.params.id;
    const exam = await Examination.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Examination not found',
      });
    }

    // Role & Ownership check: Teachers can monitor only their own exams
    if (req.user.role === 'teacher') {
      const isOwner = exam.createdBy.toString() === req.user._id.toString();
      const isAssigned = (req.user.teacherProfile?.assignedClasses || []).includes(exam.classGrade);
      if (!isOwner && !isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Teachers can only monitor their own examinations',
        });
      }
    }

    const monitorData = await getLiveExamMonitorData(examId);

    res.status(200).json({
      success: true,
      data: monitorData,
    });
  } catch (error) {
    next(error);
  }
};