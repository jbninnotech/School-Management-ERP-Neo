import ExaminationAttempt from '../models/examinationAttemptModel.js';
import AttemptAnswer from '../models/attemptAnswerModel.js';
import Examination from '../models/examinationModel.js';
import PaperVersion from '../models/paperVersionModel.js';

// Auto-evaluate against snapshotted question
export const autoEvaluateAnswer = (snapshottedQ, studentAnswer, negativeMarkingEnabled, defaultNegativeMarks) => {
  if (studentAnswer === undefined || studentAnswer === null || studentAnswer === '') {
    return { marksAwarded: 0, autoEvaluated: true, isSubjective: false };
  }

  const marks = Number(snapshottedQ.marks) || 1;
  const negMarks = negativeMarkingEnabled
    ? Number(snapshottedQ.negativeMarks) || defaultNegativeMarks || 0
    : 0;

  switch (snapshottedQ.questionType) {
    case 'single_mcq':
    case 'assertion_reason': {
      const isCorrect = String(studentAnswer).trim() === String(snapshottedQ.correctAnswer).trim();
      return {
        marksAwarded: isCorrect ? marks : -negMarks,
        autoEvaluated: true,
        isSubjective: false,
      };
    }

    case 'true_false': {
      const isCorrect = String(studentAnswer).toLowerCase() === String(snapshottedQ.correctAnswer).toLowerCase();
      return {
        marksAwarded: isCorrect ? marks : -negMarks,
        autoEvaluated: true,
        isSubjective: false,
      };
    }

    case 'multiple_select': {
      const studentArr = Array.isArray(studentAnswer) ? studentAnswer.map(String).sort() : [String(studentAnswer)];
      const correctArr = Array.isArray(snapshottedQ.correctAnswer)
        ? snapshottedQ.correctAnswer.map(String).sort()
        : [String(snapshottedQ.correctAnswer)];
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
      if (Array.isArray(snapshottedQ.correctAnswer)) {
        isCorrect = snapshottedQ.correctAnswer.some((ans) => String(ans).trim().toLowerCase() === studentStr);
      } else {
        isCorrect = String(snapshottedQ.correctAnswer).trim().toLowerCase() === studentStr;
      }
      return {
        marksAwarded: isCorrect ? marks : -negMarks,
        autoEvaluated: true,
        isSubjective: false,
      };
    }

    case 'numerical': {
      const studentNum = Number(studentAnswer);
      const correctNum = Number(snapshottedQ.correctAnswer);
      const tolerance = Number(snapshottedQ.numericalTolerance) || 0;
      const isCorrect = !isNaN(studentNum) && !isNaN(correctNum) && Math.abs(studentNum - correctNum) <= tolerance;
      return {
        marksAwarded: isCorrect ? marks : -negMarks,
        autoEvaluated: true,
        isSubjective: false,
      };
    }

    case 'match_following': {
      const studentPairs = Array.isArray(studentAnswer) ? studentAnswer : [];
      const correctPairs = Array.isArray(snapshottedQ.correctAnswer) ? snapshottedQ.correctAnswer : [];
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

    default: {
      // Descriptive, short_answer, long_answer, oral_observational, case_study
      return {
        marksAwarded: 0,
        autoEvaluated: false,
        isSubjective: true,
      };
    }
  }
};

// Check and auto-submit expired attempts (safe for cron or lazy check)
export const checkAndAutoSubmitExpiredAttempts = async (examId = null) => {
  const serverNow = new Date();
  const query = {
    status: 'in_progress',
    deadline: { $lt: serverNow },
  };
  if (examId) query.examination = examId;

  const expiredAttempts = await ExaminationAttempt.find(query);
  const results = [];

  for (const attempt of expiredAttempts) {
    try {
      attempt.status = 'auto_submitted';
      attempt.submittedAt = serverNow;
      attempt.submissionType = 'auto_timeout';

      // Pull latest answers from AttemptAnswer collection
      const answers = await AttemptAnswer.find({ attemptId: attempt._id });
      let autoScore = 0;
      let hasSubjective = false;

      // Find paper version snapshot if available, or exam sections
      const paperVersion = attempt.paperVersionId
        ? await PaperVersion.findById(attempt.paperVersionId)
        : null;

      const exam = await Examination.findById(attempt.examination);
      const negativeMarkingEnabled = exam?.negativeMarkingEnabled || false;
      const defaultNegativeMarks = exam?.defaultNegativeMarks || 0;

      // Build question lookup map
      const questionMap = new Map();
      if (paperVersion && paperVersion.sections) {
        paperVersion.sections.forEach((sec) => {
          sec.questions.forEach((q) => questionMap.set(String(q._id), q));
        });
      } else if (exam && exam.examSections) {
        exam.examSections.forEach((sec) => {
          sec.questions.forEach((q) => {
            const qId = q.questionId ? String(q.questionId) : String(q._id);
            questionMap.set(qId, q);
          });
        });
      }

      for (const ans of answers) {
        const qDef = questionMap.get(String(ans.questionId));
        if (qDef) {
          const evalResult = autoEvaluateAnswer(
            qDef,
            ans.studentAnswer,
            negativeMarkingEnabled,
            defaultNegativeMarks
          );
          ans.marksAwarded = evalResult.marksAwarded;
          ans.autoEvaluated = evalResult.autoEvaluated;
          ans.isEvaluated = evalResult.autoEvaluated;
          await ans.save();

          if (evalResult.isSubjective) {
            hasSubjective = true;
          } else {
            autoScore += evalResult.marksAwarded;
          }
        }
      }

      attempt.score.autoScore = Math.max(0, autoScore);
      attempt.score.totalScore = Math.max(0, autoScore);
      attempt.score.percentage = exam?.totalMarks > 0 ? (attempt.score.totalScore / exam.totalMarks) * 100 : 0;
      attempt.score.isPassed = attempt.score.totalScore >= (exam?.passingMarks || 40);
      attempt.status = hasSubjective ? 'evaluation_pending' : 'evaluated';

      await attempt.save();
      results.push({ attemptId: attempt._id, status: attempt.status, autoScore });
    } catch (err) {
      console.error(`Auto-submit error for attempt ${attempt._id}:`, err.message);
    }
  }

  return results;
};
