/**
 * tests/golive.test.js
 * Comprehensive GO LIVE, PAUSE, RESUME, and END Lifecycle Tests
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

let app;
let User;
let Examination;
let ExaminationAttempt;

const makeToken = (userId, role) => jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: '1h' });

beforeAll(async () => {
  const appModule = await import('../src/app.js');
  app = appModule.default;
  const dbModule = await import('../src/config/db.js');
  await dbModule.default();
  const userModule = await import('../src/models/userModel.js');
  const examModule = await import('../src/models/examinationModel.js');
  const attemptModule = await import('../src/models/examinationAttemptModel.js');
  User = userModule.default;
  Examination = examModule.default;
  ExaminationAttempt = attemptModule.default;
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('GO LIVE & Real-Time Exam Control Suite', () => {
  let teacher;
  let teacherToken;
  let principal;
  let principalToken;
  let student;
  let studentToken;
  let testExamId;

  beforeAll(async () => {
    // 1. Setup Teacher
    teacher = await User.findOne({ email: 'golive.teacher@school.com' });
    if (!teacher) {
      teacher = await User.create({
        name: 'GoLive Teacher',
        email: 'golive.teacher@school.com',
        phone: '9888888881',
        password: 'Password@123',
        role: 'teacher',
        teacherProfile: { assignedClasses: ['Class 12'], assignedSubjects: ['Physics'] },
      });
    }
    teacherToken = makeToken(teacher._id.toString(), 'teacher');

    // 2. Setup Principal
    principal = await User.findOne({ email: 'golive.principal@school.com' });
    if (!principal) {
      principal = await User.create({
        name: 'Principal Smith',
        email: 'golive.principal@school.com',
        phone: '9888888882',
        password: 'Password@123',
        role: 'principal',
      });
    }
    principalToken = makeToken(principal._id.toString(), 'principal');

    // 3. Setup Student
    student = await User.findOne({ email: 'golive.student@school.com' });
    if (!student) {
      student = await User.create({
        name: 'GoLive Student',
        email: 'golive.student@school.com',
        phone: '9888888883',
        password: 'Password@123',
        role: 'student',
        studentProfile: { classGrade: 'Class 12', section: 'A', rollNumber: 'GL-101' },
      });
    }
    studentToken = makeToken(student._id.toString(), 'student');

    // 4. Create an Exam with sections and questions
    const exam = await Examination.create({
      title: 'TEST_GOLIVE_Physics Final',
      classGrade: 'Class 12',
      sections: ['A'],
      subject: 'Physics',
      durationMinutes: 60,
      totalMarks: 50,
      passingMarks: 20,
      createdBy: teacher._id,
      status: 'draft',
      examSections: [
        {
          id: 'sec_1',
          title: 'Physics Section 1',
          durationMinutes: 60,
          totalMarks: 50,
          questions: [
            {
              questionId: new mongoose.Types.ObjectId(),
              questionText: 'What is the speed of light in vacuum?',
              questionType: 'single_mcq',
              marks: 5,
              options: [{ id: 'a', text: '3x10^8 m/s' }, { id: 'b', text: '3x10^6 m/s' }],
              correctAnswer: 'a',
            },
          ],
        },
      ],
    });
    testExamId = exam._id.toString();
  });

  afterAll(async () => {
    if (testExamId) {
      await Examination.findByIdAndDelete(testExamId);
      await ExaminationAttempt.deleteMany({ examination: testExamId });
    }
  });

  it('STEP 1: Unapproved Draft exam CANNOT go LIVE', async () => {
    const res = await request(app)
      .post(`/api/exams/${testExamId}/go-live`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/approved/i);
  });

  it('STEP 2: Principal approves the examination paper', async () => {
    const res = await request(app)
      .put(`/api/exams/${testExamId}/review`)
      .set('Authorization', `Bearer ${principalToken}`)
      .send({ action: 'approve', comments: 'Approved by Principal Smith' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
  });

  it('STEP 3: Student cannot GO LIVE (Role violation)', async () => {
    const res = await request(app)
      .post(`/api/exams/${testExamId}/go-live`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });

  it('STEP 4: Authorized Teacher clicks GO LIVE button -> Exam transitions to LIVE', async () => {
    const res = await request(app)
      .post(`/api/exams/${testExamId}/go-live`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('live');
    expect(res.body.data.isSnapshotLocked).toBe(true);
    expect(res.body.data.actualLaunchTime).toBeDefined();
  });

  it('STEP 5: Duplicate GO LIVE request is idempotent and handles gracefully', async () => {
    const res = await request(app)
      .post(`/api/exams/${testExamId}/go-live`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/already live/i);
  });

  it('STEP 6: Eligible student can immediately START attempt on LIVE exam', async () => {
    const res = await request(app)
      .post(`/api/exams/${testExamId}/start-attempt`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.attempt.status).toBe('in_progress');
    // Ensure correct answers are NOT sent to student!
    res.body.data.exam.examSections[0].questions.forEach((q) => {
      expect(q.correctAnswer).toBeUndefined();
    });
  });

  it('STEP 7: Faculty PAUSES the LIVE examination', async () => {
    const res = await request(app)
      .post(`/api/exams/${testExamId}/pause`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ reason: 'Minor audio disturbance in exam hall' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('paused');
    expect(res.body.data.pauseReason).toBe('Minor audio disturbance in exam hall');
  });

  it('STEP 8: While PAUSED, student cannot start a new attempt', async () => {
    // Attempt with a second student
    const student2 = await User.create({
      name: 'Second Student',
      email: `temp_${Date.now()}@school.com`,
      phone: '9999991111',
      password: 'Password@123',
      role: 'student',
      studentProfile: { classGrade: 'Class 12', section: 'A' },
    });
    const token2 = makeToken(student2._id.toString(), 'student');

    const res = await request(app)
      .post(`/api/exams/${testExamId}/start-attempt`)
      .set('Authorization', `Bearer ${token2}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/paused/i);

    await User.findByIdAndDelete(student2._id);
  });

  it('STEP 9: Faculty RESUMES the examination', async () => {
    const res = await request(app)
      .post(`/api/exams/${testExamId}/resume`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('live');
  });

  it('STEP 10: Faculty ENDS the examination -> Auto-submits ongoing attempts', async () => {
    const res = await request(app)
      .post(`/api/exams/${testExamId}/end`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('completed');

    // Verify existing student attempt was moved to submitted
    const att = await ExaminationAttempt.findOne({ examination: testExamId, student: student._id });
    expect(['submitted', 'auto_submitted']).toContain(att.status);
  });
});
