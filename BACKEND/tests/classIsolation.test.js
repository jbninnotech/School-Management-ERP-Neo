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
let QuestionPaper;

const makeToken = (userId, role) => jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: '1h' });

describe('Issue 4 & Issue 5: Class Isolation, Security & Directory Access Tests', () => {
  let student8Token = '';
  let student9Token = '';
  let teacherToken = '';
  let exam8AId = '';
  let paperId = '';

  beforeAll(async () => {
    const appModule = await import('../src/app.js');
    app = appModule.default;
    const dbModule = await import('../src/config/db.js');
    await dbModule.default();

    User = (await import('../src/models/userModel.js')).default;
    Examination = (await import('../src/models/examinationModel.js')).default;
    QuestionPaper = (await import('../src/models/questionPaperModel.js')).default;

    // 1. Teacher
    let teacher = await User.findOne({ email: 'teacher_iso@school.edu' });
    if (!teacher) {
      teacher = await User.create({
        name: 'Isolation Teacher',
        email: 'teacher_iso@school.edu',
        password: 'Password@123',
        phone: '+91 9876543210',
        role: 'teacher',
        schoolId: 'SCH-ISO',
        status: 'active',
      });
    }
    teacherToken = makeToken(teacher._id, 'teacher');

    // 2. Student in Class 8, Section A
    let s8 = await User.findOne({ email: 'student_8a@school.edu' });
    if (!s8) {
      s8 = await User.create({
        name: 'Student 8A',
        email: 'student_8a@school.edu',
        password: 'Password@123',
        phone: '+91 9876543211',
        role: 'student',
        schoolId: 'SCH-ISO-8A',
        status: 'active',
        studentProfile: {
          classGrade: 'Class 8',
          section: 'A',
          rollNumber: '8A-01',
        },
      });
    }
    student8Token = makeToken(s8._id, 'student');

    // 3. Student in Class 9, Section B
    let s9 = await User.findOne({ email: 'student_9b@school.edu' });
    if (!s9) {
      s9 = await User.create({
        name: 'Student 9B',
        email: 'student_9b@school.edu',
        password: 'Password@123',
        phone: '+91 9876543212',
        role: 'student',
        schoolId: 'SCH-ISO-9B',
        status: 'active',
        studentProfile: {
          classGrade: 'Class 9',
          section: 'B',
          rollNumber: '9B-01',
        },
      });
    }
    student9Token = makeToken(s9._id, 'student');

    // 4. Create Master Question Paper for Class 8
    const qp = await QuestionPaper.create({
      title: 'Class 8 Science Master Paper',
      subject: 'Science',
      classGrade: 'Class 8',
      section: 'A',
      createdBy: teacher._id,
      questions: [
        {
          questionText: 'What is photosynthesis?',
          questionType: 'single_mcq',
          marks: 5,
          options: [{ id: 'opt_1', text: 'Food making process' }],
          correctAnswer: 'opt_1',
        },
      ],
      totalMarks: 5,
    });
    paperId = qp._id.toString();

    // 5. Create Live Exam for Class 8 Section A, attaching the Question Paper
    const exam8A = await Examination.create({
      title: 'Class 8A Science Final',
      examCode: `EX-8A-${Date.now()}`,
      academicYear: '2025-2026',
      classGrade: 'Class 8',
      sections: ['A'],
      subject: 'Science',
      createdBy: teacher._id,
      questionPaperId: qp._id,
      status: 'live',
      durationMinutes: 60,
      totalMarks: 5,
      actualLaunchTime: new Date(),
      examSections: [
        {
          id: 'sec_1',
          title: 'Section A',
          questions: [
            {
              questionId: 'q_1',
              questionText: 'What is photosynthesis?',
              questionType: 'single_mcq',
              marks: 5,
              options: [{ id: 'opt_1', text: 'Food making process' }],
              correctAnswer: 'opt_1',
            },
          ],
        },
      ],
    });
    exam8AId = exam8A._id.toString();
  });

  afterAll(async () => {
    if (exam8AId) await Examination.findByIdAndDelete(exam8AId);
    if (paperId) await QuestionPaper.findByIdAndDelete(paperId);
    await mongoose.disconnect();
  });

  it('TEST 1: Student in Class 8A can see the Class 8A examination', async () => {
    const res = await request(app)
      .get('/api/exams')
      .set('Authorization', `Bearer ${student8Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const found = res.body.data?.find((e) => e._id === exam8AId);
    expect(found).toBeDefined();
    expect(found.classGrade).toBe('Class 8');
  });

  it('TEST 2: Student in Class 9B cannot see the Class 8A examination in list', async () => {
    const res = await request(app)
      .get('/api/exams')
      .set('Authorization', `Bearer ${student9Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const found = res.body.data?.find((e) => e._id === exam8AId);
    expect(found).toBeUndefined();
  });

  it('TEST 3: Student in Class 9B receives 403 on direct start-attempt call to Class 8A exam', async () => {
    const res = await request(app)
      .post(`/api/exams/${exam8AId}/start-attempt`)
      .set('Authorization', `Bearer ${student9Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Class 8');
  });

  it('TEST 4: Student in Class 9B receives 403 on direct getExamById call to Class 8A exam', async () => {
    const res = await request(app)
      .get(`/api/exams/${exam8AId}`)
      .set('Authorization', `Bearer ${student9Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('TEST 5: Students are blocked from accessing Students Directory (403)', async () => {
    const res = await request(app)
      .get('/api/auth/students')
      .set('Authorization', `Bearer ${student8Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('TEST 6: Students are blocked from accessing Teachers Directory (403)', async () => {
    const res = await request(app)
      .get('/api/auth/teachers')
      .set('Authorization', `Bearer ${student8Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('TEST 7: Teacher can access Question Papers API and create new paper', async () => {
    const res = await request(app)
      .get('/api/question-papers')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
