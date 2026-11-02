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
let ExamPattern;

const makeToken = (userId, role) => jwt.sign({ id: userId, role }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });

describe('Online Examination System Core Quality Suite', () => {
  let adminUser, teacherUser, studentUser;
  let adminToken, teacherToken, studentToken;
  let testPatternId;

  beforeAll(async () => {
    const appModule = await import('../src/app.js');
    app = appModule.default;
    const dbModule = await import('../src/config/db.js');
    await dbModule.default();

    const userModule = await import('../src/models/userModel.js');
    User = userModule.default;
    const examModule = await import('../src/models/examinationModel.js');
    Examination = examModule.default;
    const patternModule = await import('../src/models/examPatternModel.js');
    ExamPattern = patternModule.default;

    adminUser = await User.findOne({ role: { $in: ['admin', 'superadmin'] } });
    teacherUser = await User.findOne({ role: 'teacher' });
    studentUser = await User.findOne({ role: 'student' });

    if (adminUser) adminToken = makeToken(adminUser._id, adminUser.role);
    if (teacherUser) teacherToken = makeToken(teacherUser._id, teacherUser.role);
    if (studentUser) studentToken = makeToken(studentUser._id, studentUser.role);
  }, 30000);

  describe('Role-Based Security & Permissions', () => {
    it('blocks students from accessing staff exam pattern creation', async () => {
      const res = await request(app)
        .post('/api/exam-patterns')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: 'Unauthorized Pattern',
          classGrade: 'Class 10',
          subject: 'Math',
          totalMarks: 50,
          durationMinutes: 60,
          passingMarks: 20,
        });

      expect([401, 403]).toContain(res.status);
    });

    it('blocks students from accessing staff live monitoring', async () => {
      const res = await request(app)
        .get('/api/exams/dummy_id/monitor')
        .set('Authorization', `Bearer ${studentToken}`);

      expect([401, 403]).toContain(res.status);
    });
  });

  describe('Package C: Exam Pattern Lifecycle', () => {
    it('allows admin to create a structured exam pattern', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .post('/api/exam-patterns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'TEST_Automated Class 10 Pattern',
          classGrade: 'Class 10',
          subject: 'Mathematics',
          totalMarks: 50,
          durationMinutes: 60,
          passingMarks: 20,
          negativeMarking: false,
          sections: [
            {
              name: 'Section A - MCQ',
              questionType: 'single_mcq',
              numberOfQuestions: 10,
              marksPerQuestion: 1,
            },
          ],
          assignedTeachers: teacherUser ? [teacherUser._id] : [],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('TEST_Automated Class 10 Pattern');
      testPatternId = res.body.data._id;
    });

    it('allows assigned teacher to view the assigned exam pattern', async () => {
      if (!teacherToken || !testPatternId) return;

      const res = await request(app)
        .get(`/api/exam-patterns/${testPatternId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id.toString()).toBe(testPatternId.toString());
    });
  });

  describe('Package E & D: Real Aggregated Analytics & Live Monitor', () => {
    it('returns structured admin school-wide analytics', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .get('/api/dashboard/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('kpi');
      expect(res.body.data).toHaveProperty('classPerformance');
      expect(res.body.data).toHaveProperty('subjectPerformance');
    });

    it('returns student performance report for authenticated student', async () => {
      if (!studentToken) return;

      const res = await request(app)
        .get('/api/dashboard/student/report')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('student');
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data).toHaveProperty('examHistory');
    });
  });

  describe('Package G: Directories & Question Performance', () => {
    it('allows admin to query faculty question assets', async () => {
      if (!adminToken || !teacherUser) return;

      const res = await request(app)
        .get(`/api/auth/teachers/${teacherUser._id}/question-bank`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalQuestions');
    });

    it('allows querying student topic-wise question performance', async () => {
      if (!adminToken || !studentUser) return;

      const res = await request(app)
        .get(`/api/auth/students/${studentUser._id}/question-performance`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  afterAll(async () => {
    if (testPatternId) {
      await ExamPattern.findByIdAndDelete(testPatternId);
    }
  });
});
