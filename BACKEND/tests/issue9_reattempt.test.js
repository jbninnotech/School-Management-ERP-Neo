import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

let app;
let User;
let Examination;
let ExaminationAttempt;

let studentToken;
let studentUser;
let teacherUser;
let testExam;
let testExamMultiAttempt;

beforeAll(async () => {
  const appModule = await import('../src/app.js');
  app = appModule.default;
  const dbModule = await import('../src/config/db.js');
  await dbModule.default();

  const userModule = await import('../src/models/userModel.js');
  User = userModule.default;
  const examModule = await import('../src/models/examinationModel.js');
  Examination = examModule.default;
  const attemptModule = await import('../src/models/examinationAttemptModel.js');
  ExaminationAttempt = attemptModule.default;

  // Ensure unique index is built in school_erp_test
  await ExaminationAttempt.init();

  // Create a teacher to be createdBy
  const teacherEmail = `test_teacher_issue9_${Date.now()}@school.com`;
  teacherUser = await User.create({
    name: 'Issue9 Test Teacher',
    email: teacherEmail,
    phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'password123',
    role: 'teacher',
  });

  // Create or retrieve a test student
  const email = `test_student_issue9_${Date.now()}@school.com`;
  studentUser = await User.create({
    name: 'Issue9 Test Student',
    email,
    phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'password123',
    role: 'student',
    studentProfile: {
      admissionNumber: `ADM-${Date.now()}`,
      rollNumber: '99',
      classGrade: 'Class 10',
      section: 'A',
    },
  });

  // Login to get studentToken
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'password123' });
  studentToken = loginRes.body.token;

  // Create single-attempt exam (maxAttempts: 1)
  testExam = await Examination.create({
    title: 'Issue 9 Single Attempt Exam',
    examCode: `EX9-${Date.now()}`,
    classGrade: 'Class 10',
    sections: ['A'],
    subject: 'Science',
    durationMinutes: 60,
    totalMarks: 50,
    status: 'live',
    isPracticeMode: false,
    maxAttempts: 1,
    createdBy: teacherUser._id,
    examSections: [
      {
        id: 'sec_1',
        title: 'Section 1',
        questions: [
          {
            questionId: 'q_1',
            questionText: 'What is H2O?',
            questionType: 'single_mcq',
            marks: 5,
            options: [
              { optionId: 'opt_1', text: 'Water' },
              { optionId: 'opt_2', text: 'Oxygen' },
            ],
            correctAnswer: 'opt_1',
          },
        ],
      },
    ],
  });

  // Create multi-attempt exam (maxAttempts: 2)
  testExamMultiAttempt = await Examination.create({
    title: 'Issue 9 Multi Attempt Exam',
    examCode: `EX9M-${Date.now()}`,
    classGrade: 'Class 10',
    sections: ['A'],
    subject: 'Science',
    durationMinutes: 60,
    totalMarks: 50,
    status: 'live',
    isPracticeMode: false,
    maxAttempts: 2,
    createdBy: teacherUser._id,
    examSections: [
      {
        id: 'sec_1',
        title: 'Section 1',
        questions: [
          {
            questionId: 'q_1',
            questionText: 'What is CO2?',
            questionType: 'single_mcq',
            marks: 5,
            options: [
              { optionId: 'opt_1', text: 'Carbon Dioxide' },
              { optionId: 'opt_2', text: 'Carbon Monoxide' },
            ],
            correctAnswer: 'opt_1',
          },
        ],
      },
    ],
  });
});

afterAll(async () => {
  if (studentUser) {
    await ExaminationAttempt.deleteMany({ student: studentUser._id });
    await User.deleteOne({ _id: studentUser._id });
  }
  if (teacherUser) {
    await User.deleteOne({ _id: teacherUser._id });
  }
  if (testExam) {
    await Examination.deleteOne({ _id: testExam._id });
  }
  if (testExamMultiAttempt) {
    await Examination.deleteOne({ _id: testExamMultiAttempt._id });
  }
  await mongoose.disconnect();
});

describe('Issue 9: Prevent Student Re-Attempt After Submit', () => {
  let attemptId;

  it('1. Allows student to start initial attempt and resumes when starting again without submitting', async () => {
    // 1st start request
    const startRes1 = await request(app)
      .post(`/api/exams/${testExam._id}/start-attempt`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});

    expect([200, 201]).toContain(startRes1.status);
    expect(startRes1.body.success).toBe(true);
    attemptId = startRes1.body.data.attempt._id;
    expect(attemptId).toBeDefined();

    // 2nd start request while in_progress -> should resume existing attempt
    const startRes2 = await request(app)
      .post(`/api/exams/${testExam._id}/start-attempt`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});

    expect(startRes2.status).toBe(200);
    expect(startRes2.body.success).toBe(true);
    expect(startRes2.body.message).toMatch(/resuming/i);
    expect(startRes2.body.data.attempt._id.toString()).toBe(attemptId.toString());
  });

  it('2. Enforces unique compound index and prevents concurrent starts from creating duplicate attempts', async () => {
    // Both concurrent requests should resolve; compound index guarantees only 1 attempt document with attemptNumber=1
    const [resA, resB] = await Promise.all([
      request(app)
        .post(`/api/exams/${testExam._id}/start-attempt`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({}),
      request(app)
        .post(`/api/exams/${testExam._id}/start-attempt`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({}),
    ]);

    expect([200, 409]).toContain(resA.status);
    expect([200, 409]).toContain(resB.status);

    const count = await ExaminationAttempt.countDocuments({
      student: studentUser._id,
      examination: testExam._id,
    });
    expect(count).toBe(1);
  });

  it('3. Submits attempt and subsequent submit/save/heartbeat/violation calls return 409', async () => {
    // Submit the attempt
    const submitRes = await request(app)
      .post('/api/exams/submit-attempt')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        attemptId,
        submissionType: 'manual',
      });

    if (submitRes.status !== 200) {
      console.error('submitRes error body:', submitRes.body);
    }
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.success).toBe(true);

    // Verify status in DB is submitted
    const attInDb = await ExaminationAttempt.findById(attemptId);
    expect(['submitted', 'auto_submitted', 'evaluation_pending', 'evaluated']).toContain(attInDb.status);

    // Re-submitting the same attempt returns 409
    const secondSubmitRes = await request(app)
      .post('/api/exams/submit-attempt')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        attemptId,
        submissionType: 'manual',
      });
    expect(secondSubmitRes.status).toBe(409);
    expect(secondSubmitRes.body.message).toMatch(/already submitted/i);

    // save-answer returns 409
    const saveRes = await request(app)
      .post('/api/exams/save-answer')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        attemptId,
        questionId: 'q_1',
        studentAnswer: 'opt_1',
      });
    expect(saveRes.status).toBe(409);
    expect(saveRes.body.message).toMatch(/already submitted/i);

    // direct save-answer PUT returns 409
    const directSaveRes = await request(app)
      .put(`/api/exams/attempts/${attemptId}/answers/q_1`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        studentAnswer: 'opt_1',
      });
    expect(directSaveRes.status).toBe(409);
    expect(directSaveRes.body.message).toMatch(/already submitted/i);

    // heartbeat returns 409
    const hbRes = await request(app)
      .post(`/api/exams/attempts/${attemptId}/heartbeat`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});
    expect(hbRes.status).toBe(409);
    expect(hbRes.body.message).toMatch(/already submitted/i);

    // violation returns 409
    const violRes = await request(app)
      .post(`/api/exams/attempts/${attemptId}/violation`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        type: 'tab_switch',
        reason: 'Focus lost',
      });
    expect(violRes.status).toBe(409);
    expect(violRes.body.message).toMatch(/already submitted/i);
  });

  it('4. Re-attempt when maxAttempts=1 returns 409 "You have already submitted this exam"', async () => {
    const startAgainRes = await request(app)
      .post(`/api/exams/${testExam._id}/start-attempt`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});

    expect(startAgainRes.status).toBe(409);
    expect(startAgainRes.body.message).toBe('You have already submitted this exam');
  });

  it('5. Allows 2nd attempt when maxAttempts=2, but blocks 3rd attempt with 409', async () => {
    // 1st attempt on multi-attempt exam
    const att1Res = await request(app)
      .post(`/api/exams/${testExamMultiAttempt._id}/start-attempt`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});
    expect([200, 201]).toContain(att1Res.status);
    const multiAttemptId1 = att1Res.body.data.attempt._id;

    // Submit 1st attempt
    const submit1 = await request(app)
      .post('/api/exams/submit-attempt')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ attemptId: multiAttemptId1 });
    expect(submit1.status).toBe(200);

    // 2nd attempt is permitted since maxAttempts is 2
    const att2Res = await request(app)
      .post(`/api/exams/${testExamMultiAttempt._id}/start-attempt`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});
    expect([200, 201]).toContain(att2Res.status);
    const multiAttemptId2 = att2Res.body.data.attempt._id;
    expect(multiAttemptId2.toString()).not.toBe(multiAttemptId1.toString());

    // Submit 2nd attempt
    const submit2 = await request(app)
      .post('/api/exams/submit-attempt')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ attemptId: multiAttemptId2 });
    expect(submit2.status).toBe(200);

    // 3rd attempt is blocked with 409
    const att3Res = await request(app)
      .post(`/api/exams/${testExamMultiAttempt._id}/start-attempt`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});
    expect(att3Res.status).toBe(409);
    expect(att3Res.body.message).toBe('You have already submitted this exam');
  });
});
