import Question from '../models/questionModel.js';
import Examination from '../models/examinationModel.js';
import PaperVersion from '../models/paperVersionModel.js';
import AssessmentTemplate from '../models/assessmentTemplateModel.js';
import { resolveGradeBand } from './questionBankService.js';

export const validatePaperBlueprint = async (examId) => {
  const exam = await Examination.findById(examId);
  if (!exam) throw new Error('Examination not found');

  const errors = [];
  const warnings = [];

  const gradeBand = exam.gradeBand || resolveGradeBand(exam.classGrade);
  const template = exam.templateId
    ? await AssessmentTemplate.findById(exam.templateId)
    : await AssessmentTemplate.findOne({ gradeBand, isSystemDefault: true });

  const configuredTotalMarks = Number(exam.totalMarks) || 0;
  let calculatedMarks = 0;
  let totalQuestionsCount = 0;
  let totalEstimatedSec = 0;

  const difficultyCounts = { easy: 0, medium: 0, hard: 0, advanced: 0, olympiad: 0 };
  const typeCounts = {};
  const chapterCounts = {};

  const sections = exam.examSections || [];

  if (sections.length === 0) {
    errors.push('The question paper must contain at least one section.');
  }

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];
    const secQuestions = sec.questions || [];
    let secCalculatedMarks = 0;

    if (secQuestions.length === 0) {
      warnings.push(`Section "${sec.title}" contains 0 questions.`);
    }

    for (const q of secQuestions) {
      totalQuestionsCount++;
      const qMarks = Number(q.marks) || 1;
      secCalculatedMarks += qMarks;
      calculatedMarks += qMarks;

      const diff = q.difficulty || 'medium';
      difficultyCounts[diff] = (difficultyCounts[diff] || 0) + 1;

      const qType = q.questionType;
      typeCounts[qType] = (typeCounts[qType] || 0) + 1;

      if (q.chapter) {
        chapterCounts[q.chapter] = (chapterCounts[q.chapter] || 0) + 1;
      }

      totalEstimatedSec += (q.estimatedTimeMinutes || 2) * 60;

      // Grade band restriction checks
      if (template) {
        if (template.allowedQuestionTypes && template.allowedQuestionTypes.length > 0) {
          if (!template.allowedQuestionTypes.includes(qType)) {
            errors.push(`Question type "${qType}" is not permitted under template "${template.name}".`);
          }
        }
        if (!template.allowNegativeMarking && Number(q.negativeMarks) > 0) {
          errors.push(`Negative marks of ${q.negativeMarks} in question "${q.questionText?.substring(0, 30)}..." violate policy for ${gradeBand}.`);
        }
        if (template.allowedDifficultyLevels && !template.allowedDifficultyLevels.includes(diff)) {
          errors.push(`Difficulty "${diff}" is blocked for grade band ${gradeBand}.`);
        }
      }

      // Check for correct answer presence
      if (q.correctAnswer === undefined || q.correctAnswer === null || q.correctAnswer === '') {
        errors.push(`Question "${q.questionText?.substring(0, 30)}..." is missing a valid answer key.`);
      }

      // Check MCQ options count
      if (['single_mcq', 'multiple_select'].includes(qType)) {
        if (!q.options || q.options.length < 2) {
          errors.push(`Multiple-choice question "${q.questionText?.substring(0, 30)}..." must have at least 2 options.`);
        }
      }
    }

    // Section marks match check
    if (sec.totalMarks && sec.totalMarks > 0 && sec.totalMarks !== secCalculatedMarks) {
      warnings.push(
        `Section "${sec.title}" configured marks (${sec.totalMarks}) differs from calculated question sum (${secCalculatedMarks}).`
      );
    }
  }

  // Marks discrepancy
  const marksDiscrepancy = calculatedMarks - configuredTotalMarks;
  if (marksDiscrepancy !== 0) {
    errors.push(
      `Total marks mismatch: Configured is ${configuredTotalMarks}, but sum of questions is ${calculatedMarks} (Discrepancy: ${marksDiscrepancy > 0 ? '+' : ''}${marksDiscrepancy}).`
    );
  }

  // Estimated time vs duration
  const durationSec = (exam.durationMinutes || 60) * 60;
  if (totalEstimatedSec > durationSec * 1.25) {
    warnings.push(
      `Estimated completion time (~${Math.round(totalEstimatedSec / 60)} mins) exceeds scheduled exam duration (${exam.durationMinutes} mins) significantly.`
    );
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    canPublish: isValid,
    errors,
    warnings,
    summary: {
      configuredTotalMarks,
      calculatedMarks,
      marksDiscrepancy,
      totalQuestionsCount,
      estimatedTimeMinutes: Math.round(totalEstimatedSec / 60),
      durationMinutes: exam.durationMinutes,
      difficultyCounts,
      typeCounts,
      chapterCounts,
      gradeBand,
    },
  };
};

export const createPaperVersionSnapshot = async (examId, publishedByUserId, changeNotes = 'Published version') => {
  const exam = await Examination.findById(examId);
  if (!exam) throw new Error('Examination not found');

  // Run validation
  const validation = await validatePaperBlueprint(examId);
  if (!validation.isValid) {
    const errorStr = validation.errors.join(' | ');
    throw new Error(`Cannot publish paper due to validation errors: ${errorStr}`);
  }

  // Determine version number
  const latestVersion = await PaperVersion.findOne({ paperId: exam._id }).sort({ versionNumber: -1 });
  const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

  // Snapshot sections & questions
  let totalQs = 0;
  const snapshottedSections = (exam.examSections || []).map((sec, secIdx) => {
    const snapshottedQuestions = (sec.questions || []).map((q, qIdx) => {
      totalQs++;
      return {
        sourceQuestionId: q.questionId || q._id,
        sourceQuestionVersion: q.version || 1,
        questionText: q.questionText,
        questionType: q.questionType,
        difficulty: q.difficulty || 'medium',
        chapter: q.chapter || '',
        topic: q.topic || '',
        marks: Number(q.marks) || 1,
        negativeMarks: Number(q.negativeMarks) || 0,
        partialMarkingRule: q.partialMarkingRule || 'none',
        instructionText: q.instructionText || '',
        passageText: q.passageText || '',
        imageUrl: q.imageUrl || '',
        options: q.options || [],
        matchPairs: q.matchPairs || [],
        correctAnswer: q.correctAnswer,
        numericalTolerance: Number(q.numericalTolerance) || 0,
        rubric: q.rubric || '',
        explanation: q.explanation || '',
        order: q.order !== undefined ? q.order : qIdx + 1,
        internalChoiceGroup: q.internalChoiceGroup || '',
      };
    });

    return {
      id: sec.id || `sec_${secIdx + 1}`,
      title: sec.title || `Section ${String.fromCharCode(65 + secIdx)}`,
      description: sec.description || '',
      durationMinutes: Number(sec.durationMinutes) || 0,
      totalMarks: sec.totalMarks || 0,
      instructions: sec.instructions || '',
      allowedQuestionTypes: sec.allowedQuestionTypes || [],
      questions: snapshottedQuestions,
    };
  });

  const gradeBand = exam.gradeBand || resolveGradeBand(exam.classGrade);

  const paperVersion = await PaperVersion.create({
    paperId: exam._id,
    versionNumber: nextVersionNumber,
    setName: 'Set A',
    title: exam.title,
    academicYear: exam.academicYear || '2025-2026',
    classGrade: exam.classGrade,
    subject: exam.subject,
    templateId: exam.templateId,
    gradeBand,
    totalMarks: exam.totalMarks,
    passingMarks: exam.passingMarks,
    durationMinutes: exam.durationMinutes,
    sections: snapshottedSections,
    totalQuestions: totalQs,
    publishedBy: publishedByUserId,
    publishedAt: new Date(),
    changeNotes,
    isSealed: true,
  });

  // Attach version to exam
  exam.paperVersionId = paperVersion._id;
  exam.version = nextVersionNumber;
  exam.status = 'approved';
  exam.isSnapshotLocked = true;
  await exam.save();

  return paperVersion;
};
