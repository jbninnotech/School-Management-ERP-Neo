import mongoose from 'mongoose';
import Examination from '../models/examinationModel.js';
import ExaminationAttempt from '../models/examinationAttemptModel.js';
import ExaminationAuditLog from '../models/examinationAuditLogModel.js';
import User from '../models/userModel.js';

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
      // Expecting array of { left, right }
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

    // Descriptive / Subjective Types
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
// 1. CREATE EXAMINATION (Step 1-4 Wizard)
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
    } = req.body;

    if (!title || !classGrade || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Examination title, class, and subject are required',
      });
    }

    // Default 1 section if not provided
    const initialSections = examSections && examSections.length > 0
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
// 2. GET EXAMS (Scoped by Role)
// -------------------------------------------------------------
export const getExams = async (req, res, next) => {
  try {
    const { status, classGrade, subject, search } = req.query;
    const query = {};

    // Role-based filtering
    if (req.user.role === 'student') {
      const studentClass = req.user.studentProfile?.classGrade;
      const studentSection = req.user.studentProfile?.section;

      query.classGrade = studentClass;
      query.sections = studentSection;
      // Students only see approved, scheduled, in_progress, completed, or results_published
      query.status = { $in: ['scheduled', 'in_progress', 'completed', 'results_published'] };
    } else if (req.user.role === 'teacher') {
      // Teachers see exams they created or exams for their assigned classes
      const assignedClasses = req.user.teacherProfile?.assignedClasses || [];
      if (assignedClasses.length > 0) {
        query.$or = [
          { createdBy: req.user._id },
          { classGrade: { $in: assignedClasses } },
        ];
      } else {
        query.createdBy = req.user._id;
      }
    }
    // SuperAdmin and Admin see all exams

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

    res.status(200).json({
      success: true,
      count: exams.length,
      data: exams,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 3. GET SINGLE EXAM BY ID (Sanitized for Students)
// -------------------------------------------------------------
export const getExamById = async (req, res, next) => {
  try {
    const exam = await Examination.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('reviewedBy', 'name email role');

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    // Clone to manipulate
    const examObj = exam.toObject();

    // CRITICAL SECURITY: If caller is a student, NEVER leak correctAnswer or explanation!
    if (req.user.role === 'student') {
      if (examObj.examSections) {
        examObj.examSections.forEach((section) => {
          if (section.questions) {
            section.questions.forEach((q) => {
              delete q.correctAnswer;
              delete q.explanation;
              // If match pairs, shuffle right side so answer is not revealed by order!
              if (q.matchPairs && Array.isArray(q.matchPairs)) {
                const rightItems = q.matchPairs.map((p) => p.right).sort(() => Math.random() - 0.5);
                q.matchPairs = q.matchPairs.map((p, idx) => ({
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
// 4. UPDATE EXAM (Basic Info, Schedule, Rules)
// -------------------------------------------------------------
export const updateExam = async (req, res, next) => {
  try {
    const exam = await Examination.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    // Prevent modifying questions/rules once in progress or locked
    if (exam.isSnapshotLocked && req.body.examSections) {
      return res.status(400).json({
        success: false,
        message: 'Question paper is locked because examinations or attempts have already commenced',
      });
    }

    // Role verification
    if (req.user.role === 'teacher' && exam.createdBy.toString() !== req.user._id.toString()) {
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
// 5. UPDATE QUESTION PAPER (Sections & Questions Builder)
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

    // Calculate total question marks across sections
    let calculatedTotal = 0;
    let totalQuestionsCount = 0;

    const formattedSections = examSections.map((sec, secIdx) => {
      let secMarks = 0;
      const formattedQs = (sec.questions || []).map((q, qIdx) => {
        const qMarks = Number(q.marks) || 1;
        secMarks += qMarks;
        totalQuestionsCount++;
        return {
          questionId: q.questionId || q._id,
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
// 6. SUBMIT EXAM FOR REVIEW (Teacher -> Principal)
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
// 7. REVIEW EXAM (Principal/Admin Approves or Rejects)
// -------------------------------------------------------------
export const reviewExam = async (req, res, next) => {
  try {
    const { action, comments } = req.body; // action: 'approve' | 'reject'
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
// 8. SCHEDULE EXAM (Confirmed Date, Time & Availability)
// -------------------------------------------------------------
export const scheduleExam = async (req, res, next) => {
  try {
    const { examDate, startTime, endTime, durationMinutes, sections } = req.body;
    const exam = await Examination.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    if (exam.status !== 'approved' && exam.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Only approved question papers can be scheduled',
      });
    }

    if (examDate) exam.examDate = new Date(examDate);
    if (startTime) exam.startTime = new Date(startTime);
    if (endTime) exam.endTime = new Date(endTime);
    if (durationMinutes) exam.durationMinutes = Number(durationMinutes);
    if (sections) exam.sections = sections;

    exam.status = 'scheduled';
    await exam.save();

    await logAuditEvent(exam._id, req.user._id, req.user.role, 'EXAM_SCHEDULED', {
      examDate: exam.examDate,
      startTime: exam.startTime,
      endTime: exam.endTime,
    });

    res.status(200).json({
      success: true,
      message: 'Examination scheduled successfully',
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 9. START EXAM ATTEMPT (Student Dedicated Portal)
// -------------------------------------------------------------
export const startExamAttempt = async (req, res, next) => {
  try {
    const exam = await Examination.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    // Verification of Class & Section
    const studentClass = req.user.studentProfile?.classGrade;
    const studentSection = req.user.studentProfile?.section;

    if (studentClass && exam.classGrade !== studentClass) {
      return res.status(403).json({
        success: false,
        message: `This examination is configured for ${exam.classGrade}, but your profile is registered under ${studentClass}`,
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

    // Check existing attempts
    const existingAttempts = await ExaminationAttempt.find({
      student: req.user._id,
      examination: exam._id,
    }).sort({ attemptNumber: -1 });

    const activeAttempt = existingAttempts.find((att) => att.status === 'in_progress');
    const completedAttemptsCount = existingAttempts.filter((att) =>
      ['submitted', 'auto_submitted', 'evaluation_pending', 'evaluated', 'result_published'].includes(att.status)
    ).length;

    // Check Max Attempts
    if (completedAttemptsCount >= (exam.maxAttempts || 1)) {
      return res.status(403).json({
        success: false,
        message: `You have exhausted the maximum allowed attempts (${exam.maxAttempts || 1}) for this examination`,
      });
    }

    // If an attempt is currently in progress, return it
    if (activeAttempt) {
      const serverNow = new Date();
      // Check if deadline has passed
      if (serverNow > activeAttempt.deadline) {
        activeAttempt.status = 'auto_submitted';
        activeAttempt.submittedAt = serverNow;
        activeAttempt.submissionType = 'auto_timeout';
        await activeAttempt.save();

        return res.status(400).json({
          success: false,
          message: 'The examination time limit has expired. Your attempt has been automatically submitted.',
        });
      }

      // Return ongoing attempt with sanitized exam questions
      const sanitizedExam = exam.toObject();
      sanitizedExam.examSections.forEach((s) =>
        s.questions.forEach((q) => {
          delete q.correctAnswer;
          delete q.explanation;
        })
      );

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

    // Start New Attempt: Authoritative Server Deadline Calculation
    const serverNow = new Date();
    const durationMs = (exam.durationMinutes || 60) * 60 * 1000;
    let deadline = new Date(serverNow.getTime() + durationMs);

    // If exam has a strict endTime, deadline cannot exceed exam.endTime
    if (exam.endTime && exam.endTime < deadline) {
      deadline = new Date(exam.endTime);
    }

    // Initialize answer slots from exam sections
    const initialAnswers = [];
    exam.examSections.forEach((section) => {
      section.questions.forEach((q) => {
        initialAnswers.push({
          questionId: q.questionId ? q.questionId.toString() : q._id.toString(),
          sectionId: section.id,
          questionType: q.questionType,
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
      attemptNumber: completedAttemptsCount + 1,
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

    // Lock snapshot once students begin taking the exam
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

    // Sanitized Exam Object for student
    const sanitizedExam = exam.toObject();
    sanitizedExam.examSections.forEach((s) =>
      s.questions.forEach((q) => {
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
// 10. SAVE STUDENT ANSWER (Incremental Autosave)
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

    // Server-Side Deadline Enforcement
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

    // Find or create question slot in attempt
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
// 11. RECORD TAB SWITCH (Anti-Cheat Logging)
// -------------------------------------------------------------
export const recordTabSwitch = async (req, res, next) => {
  try {
    const { attemptId, reason } = req.body;
    const attempt = await ExaminationAttempt.findById(attemptId);

    if (attempt && attempt.status === 'in_progress') {
      attempt.tabSwitchesCount = (attempt.tabSwitchesCount || 0) + 1;
      attempt.tabSwitchLogs.push({
        timestamp: new Date(),
        reason: reason || 'Focus lost: Tab switch or window blur',
      });
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
// 12. SUBMIT EXAMINATION (Manual or Auto-Timeout)
// -------------------------------------------------------------
export const submitExamAttempt = async (req, res, next) => {
  try {
    const { attemptId, submissionType = 'manual' } = req.body;
    const attempt = await ExaminationAttempt.findById(attemptId);

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Examination attempt not found' });
    }

    if (attempt.student.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to submit this attempt' });
    }

    if (['submitted', 'auto_submitted', 'evaluated', 'result_published'].includes(attempt.status)) {
      return res.status(400).json({
        success: false,
        message: 'This examination attempt has already been submitted',
      });
    }

    const exam = await Examination.findById(attempt.examination);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam record not found' });
    }

    const serverNow = new Date();
    attempt.submittedAt = serverNow;
    attempt.submissionType = submissionType;

    // RUN AUTOMATIC EVALUATION ENGINE
    let autoScore = 0;
    let hasSubjectiveQuestions = false;
    const sectionScores = {};

    exam.examSections.forEach((sec) => {
      sectionScores[sec.id] = {
        sectionId: sec.id,
        title: sec.title,
        marksObtained: 0,
        maxMarks: sec.totalMarks || 0,
      };

      sec.questions.forEach((q) => {
        const qId = (q.questionId ? q.questionId.toString() : q._id.toString());
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
          if (sectionScores[sec.id]) {
            sectionScores[sec.id].marksObtained += evalResult.marksAwarded;
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

    if (hasSubjectiveQuestions) {
      attempt.status = 'evaluation_pending';
    } else {
      attempt.status = 'evaluated';
    }

    // If exam has immediate result publication configured
    if (exam.resultPublicationMode === 'immediate') {
      attempt.isResultPublished = true;
      attempt.resultPublishedAt = serverNow;
    }

    await attempt.save();

    await logAuditEvent(exam._id, req.user._id, req.user.role, 'EXAM_SUBMITTED', {
      submissionType,
      autoScore,
      hasSubjectiveQuestions,
    });

    res.status(200).json({
      success: true,
      message: 'Examination submitted successfully',
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
// 13. GET SUBMISSIONS FOR TEACHER / PRINCIPAL EVALUATION
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
// 14. GET SINGLE ATTEMPT FOR EVALUATION
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
// 15. SAVE MANUAL EVALUATION (Teacher Scoring for Subjective Qs)
// -------------------------------------------------------------
export const saveManualEvaluation = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { evaluations, evaluationNotes } = req.body; // Array of { questionId, marksAwarded, feedback }

    const attempt = await ExaminationAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    const exam = await Examination.findById(attempt.examination);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam record not found' });
    }

    let manualScore = 0;

    // Apply manual scores
    evaluations.forEach((item) => {
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
// 16. PUBLISH / UNPUBLISH RESULTS (Principal / SuperAdmin)
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

    // Update all attempts
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
// 17. GET EXAM ANALYTICS DASHBOARD
// -------------------------------------------------------------
export const getExamAnalytics = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const exam = await Examination.findById(examId);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    // Eligible candidates count
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

    // Question-wise performance breakdown
    const questionPerformance = [];
    exam.examSections.forEach((sec) => {
      sec.questions.forEach((q) => {
        const qId = q.questionId ? q.questionId.toString() : q._id.toString();
        let totalAttempted = 0;
        let correctCount = 0;

        submittedAttempts.forEach((att) => {
          const ans = att.answers.find((a) => a.questionId === qId);
          if (ans && ans.isAnswered) {
            totalAttempted++;
            if (ans.marksAwarded > 0) correctCount++;
          }
        });

        questionPerformance.push({
          questionId: qId,
          sectionTitle: sec.title,
          questionText: q.questionText,
          questionType: q.questionType,
          marks: q.marks,
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
// 18. GET STUDENT RESULT & QUESTION REVIEW
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

    // If caller is student and results are NOT published (and not practice mode)
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

    // Full detailed review with questions, student answers, correct answers, explanations
    const detailedReview = [];
    exam.examSections.forEach((sec) => {
      sec.questions.forEach((q) => {
        const qId = q.questionId ? q.questionId.toString() : q._id.toString();
        const ansSlot = attempt.answers.find((a) => a.questionId === qId);

        detailedReview.push({
          questionId: qId,
          sectionTitle: sec.title,
          questionText: q.questionText,
          questionType: q.questionType,
          marks: q.marks,
          options: q.options,
          matchPairs: q.matchPairs,
          passageText: q.passageText,
          imageUrl: q.imageUrl,
          studentAnswer: ansSlot ? ansSlot.studentAnswer : null,
          isAnswered: ansSlot ? ansSlot.isAnswered : false,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
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
