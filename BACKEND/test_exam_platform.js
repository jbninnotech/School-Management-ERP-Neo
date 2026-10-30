import assert from 'assert';
import { resolveGradeBand, validateQuestionForBand, normalizeText } from './src/services/questionBankService.js';
import { autoEvaluateAnswer } from './src/services/examEngineService.js';

console.log('🧪 Starting Examination System Architecture Test Suite...');

// 1. Grade Band Resolution Test
console.log('Test 1: Grade Band Resolution');
assert.strictEqual(resolveGradeBand('Nursery'), 'early_years');
assert.strictEqual(resolveGradeBand('LKG'), 'early_years');
assert.strictEqual(resolveGradeBand('UKG'), 'early_years');
assert.strictEqual(resolveGradeBand('Class 1'), 'primary');
assert.strictEqual(resolveGradeBand('Class 5'), 'primary');
assert.strictEqual(resolveGradeBand('Class 8'), 'middle');
assert.strictEqual(resolveGradeBand('Class 10'), 'secondary');
assert.strictEqual(resolveGradeBand('Class 12'), 'senior_secondary');
console.log('✅ Passed Grade Band Resolution');

// 2. Age-appropriate Guardrails Test
console.log('Test 2: Age-appropriate Guardrails');
const juniorInvalidDiff = validateQuestionForBand('primary', 'single_mcq', 'advanced', 0);
assert.strictEqual(juniorInvalidDiff.isValid, false, 'Primary should block advanced difficulty');

const juniorInvalidNeg = validateQuestionForBand('early_years', 'single_mcq', 'easy', 0.5);
assert.strictEqual(juniorInvalidNeg.isValid, false, 'Early years must block negative marking');

const seniorValid = validateQuestionForBand('senior_secondary', 'single_mcq', 'advanced', 1);
assert.strictEqual(seniorValid.isValid, true, 'Senior secondary permits advanced & negative marking');
console.log('✅ Passed Age-appropriate Guardrails');

// 3. Normalization for Duplicate Detection
console.log('Test 3: Normalization & Duplicate Detection');
const t1 = normalizeText('What is the Capital of India???');
const t2 = normalizeText('what is the capital of india?');
assert.strictEqual(t1, t2);
assert.strictEqual(t1, 'what is the capital of india');
console.log('✅ Passed Duplicate Detection Normalization');

// 4. Server-authoritative Auto Evaluation
console.log('Test 4: Auto-Evaluation Logic');
const mcqQuestion = {
  questionType: 'single_mcq',
  marks: 4,
  negativeMarks: 1,
  correctAnswer: 'opt_2',
};

const correctAttempt = autoEvaluateAnswer(mcqQuestion, 'opt_2', true, 0);
assert.strictEqual(correctAttempt.marksAwarded, 4);
assert.strictEqual(correctAttempt.autoEvaluated, true);

const wrongAttempt = autoEvaluateAnswer(mcqQuestion, 'opt_1', true, 0);
assert.strictEqual(wrongAttempt.marksAwarded, -1);

const subjectiveQuestion = {
  questionType: 'long_answer',
  marks: 10,
};
const subjAttempt = autoEvaluateAnswer(subjectiveQuestion, 'Essay text', false, 0);
assert.strictEqual(subjAttempt.marksAwarded, 0);
assert.strictEqual(subjAttempt.isSubjective, true);
assert.strictEqual(subjAttempt.autoEvaluated, false);
console.log('✅ Passed Server-authoritative Auto Evaluation');

console.log('🎉 ALL EXAM PLATFORM ARCHITECTURE TESTS PASSED SUCCESSFULLY!');
