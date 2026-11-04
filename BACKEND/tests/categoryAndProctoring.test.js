import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Category from '../src/models/categoryModel.js';
import Examination from '../src/models/examinationModel.js';
import ExaminationAttempt from '../src/models/examinationAttemptModel.js';
import Question from '../src/models/questionModel.js';

import User from '../src/models/userModel.js';

let app;
let adminUser;
let teacherUser;
let studentAUser;
let studentBUser;
let adminToken;
let teacherToken;
let studentAToken;
let studentBToken;

beforeAll(async () => {
  const appModule = await import('../src/app.js');
  app = appModule.default;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  // Create real test users in database
  adminUser = await User.create({
    name: 'Test Admin',
    email: `admin_${Date.now()}@school.erp`,
    password: 'password123',
    phone: '9876543210',
    role: 'admin',
    schoolId: 'SCH-ADMIN',
    isActive: true,
  });

  teacherUser = await User.create({
    name: 'Test Teacher',
    email: `teacher_${Date.now()}@school.erp`,
    password: 'password123',
    phone: '9876543211',
    role: 'teacher',
    schoolId: 'SCH-TEACHER',
    teacherProfile: { subjects: ['Mathematics', 'Science'] },
    isActive: true,
  });

  studentAUser = await User.create({
    name: 'Student A',
    email: `studentA_${Date.now()}@school.erp`,
    password: 'password123',
    phone: '9876543212',
    role: 'student',
    schoolId: 'SCH-STU-A',
    studentProfile: { classGrade: 'TestClass', section: 'A', rollNumber: '101' },
    isActive: true,
  });

  studentBUser = await User.create({
    name: 'Student B',
    email: `studentB_${Date.now()}@school.erp`,
    password: 'password123',
    phone: '9876543213',
    role: 'student',
    schoolId: 'SCH-STU-B',
    studentProfile: { classGrade: 'TestClass', section: 'B', rollNumber: '102' },
    isActive: true,
  });

  adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, process.env.JWT_SECRET);
  teacherToken = jwt.sign({ id: teacherUser._id, role: 'teacher' }, process.env.JWT_SECRET);
  studentAToken = jwt.sign({ id: studentAUser._id, role: 'student' }, process.env.JWT_SECRET);
  studentBToken = jwt.sign({ id: studentBUser._id, role: 'student' }, process.env.JWT_SECRET);
});

afterAll(async () => {
  // Cleanup test categories and users
  await Category.deleteMany({ classGrade: 'TestClass' });
  if (adminUser) await User.findByIdAndDelete(adminUser._id);
  if (teacherUser) await User.findByIdAndDelete(teacherUser._id);
  if (studentAUser) await User.findByIdAndDelete(studentAUser._id);
  if (studentBUser) await User.findByIdAndDelete(studentBUser._id);
  await mongoose.disconnect();
});

describe('Issue 1: 4-Level Category Hierarchy & Rules', () => {
  let createdUnitId;
  let createdTopicId;

  it('1. Admin can create Level 1 Unit category', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Unit 1 - Real Numbers',
        level: 'unit',
        subject: 'Mathematics',
        classGrade: 'TestClass',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Unit 1 - Real Numbers');
    expect(res.body.data.level).toBe('unit');
    createdUnitId = res.body.data._id;
  });

  it('2. Prevents duplicate category name under the same parent', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Unit 1 - Real Numbers',
        level: 'unit',
        subject: 'Mathematics',
        classGrade: 'TestClass',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('3. Can create Level 2 Topic under the Unit parent', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Fundamental Theorem of Arithmetic',
        level: 'topic',
        parentId: createdUnitId,
        subject: 'Mathematics',
        classGrade: 'TestClass',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.parentId.toString()).toBe(createdUnitId.toString());
    expect(res.body.data.path).toContain(createdUnitId.toString());
    createdTopicId = res.body.data._id;
  });

  it('4. Search returns matching categories with full breadcrumb path', async () => {
    const res = await request(app)
      .get('/api/categories/search?subject=Mathematics&classGrade=TestClass&q=Arithmetic')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].fullPath).toContain('Unit 1 - Real Numbers > Fundamental Theorem of Arithmetic');
  });

  it('5. Cascading endpoint returns only children of specified parent', async () => {
    const res = await request(app)
      .get(`/api/categories/cascading?subject=Mathematics&classGrade=TestClass&parentId=${createdUnitId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.some((c) => c._id.toString() === createdTopicId.toString())).toBe(true);
  });

  it('6. Blocks deleting a category that has child categories', async () => {
    const res = await request(app)
      .delete(`/api/categories/${createdUnitId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.hasChildren).toBe(true);
  });

  it('7. Blocks deleting a category currently in use by questions', async () => {
    // Create dummy question referencing topic
    const q = await Question.create({
      schoolId: 'SCH-DEFAULT',
      classGrade: 'TestClass',
      subject: 'Mathematics',
      questionType: 'short_answer',
      questionText: 'State the fundamental theorem of arithmetic?',
      correctAnswer: 'Every composite number...',
      createdBy: teacherUser._id,
      unitId: createdUnitId,
      topicId: createdTopicId,
    });

    const res = await request(app)
      .delete(`/api/categories/${createdTopicId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.isInUse).toBe(true);

    await Question.findByIdAndDelete(q._id);
  });
});

describe('Issue 1: PDF Ownership & Security (Student 403 Forbidden)', () => {
  it('Student B cannot download Student A performance report PDF (returns 403)', async () => {
    const res = await request(app)
      .get(`/api/dashboard/student/${studentAUser._id}/report/pdf`)
      .set('Authorization', `Bearer ${studentBToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe('Issue 4: Server Face Pause & Violation Auto-Submit Accounting', () => {
  let testExam;
  let testAttempt;

  beforeAll(async () => {
    testExam = await Examination.create({
      title: 'Proctoring Unit Exam',
      subject: 'Mathematics',
      classGrade: 'TestClass',
      createdBy: teacherUser._id,
      totalMarks: 50,
      durationMinutes: 30,
      facePauseRule: 'freeze_timer',
      maxFacePauseMinutes: 1, // 1 minute limit for testing
      maxWarnings: 3,
      examSections: [
        {
          id: 'sec_1',
          title: 'Section A',
          questions: [
            {
              questionId: 'q_test_1',
              questionText: 'Test question 1?',
              questionType: 'short_answer',
              marks: 5,
            },
          ],
        },
      ],
    });

    testAttempt = await ExaminationAttempt.create({
      student: studentAUser._id,
      examination: testExam._id,
      deadline: new Date(Date.now() + 30 * 60 * 1000),
      status: 'in_progress',
    });
  });

  afterAll(async () => {
    if (testExam) await Examination.findByIdAndDelete(testExam._id);
    if (testAttempt) await ExaminationAttempt.findByIdAndDelete(testAttempt._id);
  });

  it('1. Logs face_out_of_frame violation and marks faceStatus', async () => {
    const res = await request(app)
      .post(`/api/exams/attempts/${testAttempt._id}/violation`)
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({
        type: 'face_out_of_frame',
        reason: 'Face out of guide box',
      });

    expect(res.status).toBe(200);
    expect(res.body.warningCount).toBe(1);

    const att = await ExaminationAttempt.findById(testAttempt._id);
    expect(att.isFacePaused).toBe(true);
    expect(att.faceStatus).toBe('out_of_frame');
  });

  it('2. Resumes face with face_resumed and accounts for paused duration', async () => {
    const res = await request(app)
      .post(`/api/exams/attempts/${testAttempt._id}/violation`)
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({
        type: 'face_resumed',
      });

    expect(res.status).toBe(200);
    expect(res.body.isFacePaused).toBe(false);

    const att = await ExaminationAttempt.findById(testAttempt._id);
    expect(att.isFacePaused).toBe(false);
    expect(att.faceStatus).toBe('in_frame');
  });

  it('3. Auto-submits attempt when total face pause duration exceeds limit', async () => {
    // Set facePausedAt to 2 minutes ago (limit is 1 min)
    await ExaminationAttempt.findByIdAndUpdate(testAttempt._id, {
      isFacePaused: true,
      facePausedAt: new Date(Date.now() - 120 * 1000),
      totalFacePausedSeconds: 0,
    });

    const res = await request(app)
      .post(`/api/exams/attempts/${testAttempt._id}/heartbeat`)
      .set('Authorization', `Bearer ${studentAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('auto_submitted');
    expect(res.body.submissionType).toBe('auto_submitted_violation');

    const att = await ExaminationAttempt.findById(testAttempt._id);
    expect(att.status).toBe('auto_submitted');
    expect(att.submissionType).toBe('auto_submitted_violation');
  });
});
