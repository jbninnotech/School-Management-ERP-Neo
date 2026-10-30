import Question from '../models/questionModel.js';
import AssessmentTemplate from '../models/assessmentTemplateModel.js';

// Grade band resolution helper
export const resolveGradeBand = (classGrade) => {
  const normalized = (classGrade || '').toLowerCase().trim();
  if (['nursery', 'lkg', 'ukg', 'pre-kg', 'kg'].some((c) => normalized.includes(c))) {
    return 'early_years';
  }
  const primaryMatches = ['class 1', 'class 2', 'class 3', 'class 4', 'class 5', 'grade 1', 'grade 2', 'grade 3', 'grade 4', 'grade 5', '1', '2', '3', '4', '5'];
  if (primaryMatches.some((c) => normalized === c || normalized === `class ${c}`)) {
    return 'primary';
  }
  const middleMatches = ['class 6', 'class 7', 'class 8', 'grade 6', 'grade 7', 'grade 8', '6', '7', '8'];
  if (middleMatches.some((c) => normalized === c || normalized === `class ${c}`)) {
    return 'middle';
  }
  const secondaryMatches = ['class 9', 'class 10', 'grade 9', 'grade 10', '9', '10'];
  if (secondaryMatches.some((c) => normalized === c || normalized === `class ${c}`)) {
    return 'secondary';
  }
  return 'senior_secondary';
};

// Validate whether a question configuration is allowed for a grade band
export const validateQuestionForBand = (band, questionType, difficulty, negativeMarks) => {
  if (band === 'early_years' || band === 'primary') {
    if (['advanced', 'olympiad'].includes(difficulty)) {
      return {
        isValid: false,
        reason: `Advanced/Olympiad difficulty is blocked for ${band === 'early_years' ? 'Early Years' : 'Primary'} level unless superadmin overrides.`,
      };
    }
    if (negativeMarks > 0) {
      return {
        isValid: false,
        reason: `Negative marking is strictly prohibited for ${band === 'early_years' ? 'Early Years' : 'Primary'} level assessments.`,
      };
    }
  }
  return { isValid: true };
};

// Text normalization for duplicate detection
export const normalizeText = (text) => {
  return (text || '')
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const findDuplicateQuestion = async (classGrade, subject, questionText, excludeId = null) => {
  const normalized = normalizeText(questionText);
  if (!normalized || normalized.length < 10) return null;

  // Search existing questions in same class & subject
  const candidates = await Question.find({
    classGrade,
    subject,
    isArchived: { $ne: true },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).select('_id questionText difficulty questionType');

  for (const cand of candidates) {
    const candNorm = normalizeText(cand.questionText);
    if (candNorm === normalized) {
      return cand;
    }
  }
  return null;
};
