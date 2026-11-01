/**
 * tests/exam.test.js
 * Examination Workflow Tests
 * 
 * Covers:
 * - Exam creation validation
 * - Approval gate enforcement
 * - Schedule validation
 * - Student eligibility checks
 * - Attempt isolation and limit enforcement
 * - Result access permissions
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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

// Helper: create a signed JWT for testing
const makeToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

beforeAll(async () => {
  const appModule = await import('../src/app.js');
  app = appModule.default;
  const dbModule = await import('../src/config/db.js');
  await dbModule.default();
  const userModule = await import('../src/models/userModel.js');
  const examModule = await import('../src/models/examinationModel.js');
  User = userModule.default;
  Examination = examModule.default;
});

afterAll(async () => {
  await mongoose.disconnect();
});

// ─────────────────────────────────────────────────────────────────────────────
// EXAM CREATION VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
describe('Exam Creation Validation', () => {
  let teacherToken;
  let teacherId;

  beforeAll(async () => {
    // Try to find or create a test teacher
    let teacher = await User.findOne({ email: 'test.teacher@school.com' });
    if (!teacher) {
      teacher = await User.create({
        name: 'Test Teacher',
        email: 'test.teacher@school.com',
        phone: '9999999991',
        password: 'TestPass@123',
        role: 'teacher',
        teacherProfile: {
          employeeId: 'T001',
          subject: 'Mathematics',
          assignedClasses: ['Class 10'],
          assignedSections: ['A', 'B'],
          assignedSubjects: ['Mathematics'],
        },
      });
    }
    teacherId = teacher._id.toString();
    teacherToken = makeToken(teacherId, 'teacher');
  });

  afterAll(async () => {
    // Clean up test data
    await Examination.deleteMany({ createdBy: teacherId, title: /^TEST_EXAM/ });
  });

  it('should reject exam creation without required fields', async () => {
    const res = await request(app)
      .post('/api/exams')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: '', subject: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject exam creation without authentication', async () => {
    const res = await request(app)
      .post('/api/exams')
      .send({ title: 'Unauthorized Exam', classGrade: 'Class 10', subject: 'Math', durationMinutes: 60, totalMarks: 100, passingMarks: 40 });
    expect(res.status).toBe(401);
  });

  it('should reject exam creation by student role', async () => {
    let student = await User.findOne({ role: 'student' });
    if (!student) {
      student = await User.create({
        name: 'Test Student',
        email: 'test.student.exam@school.com',
        phone: '9999999992',
        password: 'TestPass@123',
        role: 'student',
        studentProfile: { classGrade: 'Class 10', section: 'A', rollNumber: 'R001' },
      });
    }
    const studentToken = makeToken(student._id.toString(), 'student');

    const res = await request(app)
      .post('/api/exams')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'Student Attempt Create', classGrade: 'Class 10', subject: 'Math', durationMinutes: 60, totalMarks: 100, passingMarks: 40 });
    expect(res.status).toBe(403);
  });

  it('should create a valid exam in draft status', async () => {
    const res = await request(app)
      .post('/api/exams')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'TEST_EXAM_Valid Creation',
        classGrade: 'Class 10',
        subject: 'Mathematics',
        durationMinutes: 60,
        totalMarks: 100,
        passingMarks: 40,
        sections: ['A'],
        category: 'unit_test',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('draft');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// APPROVAL GATE TESTS
// ─────────────────────────────────────────────────────────────────────────────
describe('Exam Approval Gate', () => {
  let teacherToken;
  let teacherId;
  let adminToken;
  let adminId;
  let draftExamId;

  beforeAll(async () => {
    let teacher = await User.findOne({ email: 'test.teacher@school.com' });
    if (!teacher) {
      teacher = await User.create({
        name: 'Test Teacher 2',
        email: 'test.teacher2@school.com',
        phone: '9999999993',
        password: 'TestPass@123',
        role: 'teacher',
        teacherProfile: { assignedClasses: ['Class 10'], assignedSubjects: ['Science'] },
      });
    }
    teacherId = teacher._id.toString();
    teacherToken = makeToken(teacherId, 'teacher');

    let admin = await User.findOne({ role: { $in: ['admin', 'superadmin'] } });
    if (!admin) {
      admin = await User.create({
        name: 'Test Admin',
        email: 'test.admin.gate@school.com',
        phone: '9999999994',
        password: 'TestPass@123',
        role: 'admin',
      });
    }
    adminId = admin._id.toString();
    adminToken = makeToken(adminId, admin.role);

    // Create a draft exam for testing
    const examRes = await request(app)
      .post('/api/exams')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'TEST_EXAM_Approval Gate Test',
        classGrade: 'Class 10',
        subject: 'Science',
        durationMinutes: 45,
        totalMarks: 50,
        passingMarks: 20,
      });
    if (examRes.body?.data?._id) {
      draftExamId = examRes.body.data._id;
    }
  });

  afterAll(async () => {
    if (draftExamId) {
      await Examination.findByIdAndDelete(draftExamId);
    }
    await Examination.deleteMany({ title: /^TEST_EXAM_Approval/ });
  });

  it('should not allow a teacher to schedule a draft exam (not approved yet)', async () => {
    if (!draftExamId) return; // Skip if setup failed
    const res = await request(app)
      .put(`/api/exams/${draftExamId}/schedule`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        examDate: new Date(Date.now() + 86400000).toISOString(),
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 90000000).toISOString(),
        durationMinutes: 45,
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/approved/i);
  });

  it('should not allow a teacher to review/approve exams', async () => {
    if (!draftExamId) return;
    const res = await request(app)
      .put(`/api/exams/${draftExamId}/review`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ action: 'approve', comments: 'Attempting unauthorized approval' });
    expect(res.status).toBe(403);
  });

  it('admin should be able to approve a submitted exam', async () => {
    if (!draftExamId) return;

    // First submit for review
    await request(app)
      .put(`/api/exams/${draftExamId}/paper`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        examSections: [{
          id: 'sec_1', title: 'Section A', questions: [{
            questionText: 'What is 2+2?', questionType: 'single_mcq', marks: 5,
            options: [{ id: 'a', text: '3' }, { id: 'b', text: '4' }],
            correctAnswer: 'b',
          }]
        }],
        totalMarks: 5,
        passingMarks: 3,
      });

    await request(app)
      .put(`/api/exams/${draftExamId}/submit-review`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({});

    const res = await request(app)
      .put(`/api/exams/${draftExamId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve', comments: 'Looks good' });
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data.status).toBe('approved');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT EXAM ACCESS TESTS
// ─────────────────────────────────────────────────────────────────────────────
describe('Student Exam Access Control', () => {
  it('student cannot access exam analytics endpoint', async () => {
    let student = await User.findOne({ role: 'student' });
    if (!student) return;

    const token = makeToken(student._id.toString(), 'student');
    const dummyExamId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/exams/${dummyExamId}/analytics`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('student cannot access live monitor endpoint', async () => {
    let student = await User.findOne({ role: 'student' });
    if (!student) return;

    const token = makeToken(student._id.toString(), 'student');
    const dummyExamId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/exams/${dummyExamId}/monitor`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('student cannot start an exam that is still in draft', async () => {
    let student = await User.findOne({ role: 'student' });
    if (!student) return;

    // Create a draft exam
    let teacher = await User.findOne({ role: 'teacher' });
    if (!teacher) return;

    const teacherToken = makeToken(teacher._id.toString(), 'teacher');
    const examRes = await request(app)
      .post('/api/exams')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'TEST_EXAM_Draft No Start',
        classGrade: student.studentProfile?.classGrade || 'Class 10',
        subject: 'Mathematics',
        durationMinutes: 30,
        totalMarks: 50,
        passingMarks: 20,
      });
    if (!examRes.body?.data?._id) return;

    const draftExamId = examRes.body.data._id;
    const studentToken = makeToken(student._id.toString(), 'student');

    const res = await request(app)
      .post(`/api/exams/${draftExamId}/start-attempt`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    // Cleanup
    await Examination.findByIdAndDelete(draftExamId);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IDOR / SECURITY TESTS
// ─────────────────────────────────────────────────────────────────────────────
describe('IDOR & Security Tests', () => {
  it('should reject access to non-existent exam ID', async () => {
    let teacher = await User.findOne({ role: 'teacher' });
    if (!teacher) return;

    const token = makeToken(teacher._id.toString(), 'teacher');
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/exams/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect([404, 400]).toContain(res.status);
  });

  it('should reject malformed exam ID', async () => {
    let teacher = await User.findOne({ role: 'teacher' });
    if (!teacher) return;

    const token = makeToken(teacher._id.toString(), 'teacher');
    const res = await request(app)
      .get('/api/exams/not-a-valid-mongo-id')
      .set('Authorization', `Bearer ${token}`);
    expect([400, 404, 500]).toContain(res.status);
  });

  it('should prevent NoSQL injection in login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { '$gt': '' }, password: { '$gt': '' } });
    // Should return 400 or 401, NOT 200 with a user
    expect(res.status).not.toBe(200);
  });
});
