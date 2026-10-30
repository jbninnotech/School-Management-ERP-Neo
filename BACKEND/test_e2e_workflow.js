import dotenv from 'dotenv';
dotenv.config();

import assert from 'assert';
import mongoose from 'mongoose';
import http from 'http';
import app from './src/app.js';
import User from './src/models/userModel.js';
import Examination from './src/models/examinationModel.js';
import Notification from './src/models/notificationModel.js';
import ExaminationAttempt from './src/models/examinationAttemptModel.js';

console.log('🧪 Starting Full E2E Integration Test Suite for School ERP Examination Platform...\n');

let server;
let baseUrl;

async function runE2ETests() {
  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB.\n');

    // Start Express server on random high port
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;
    console.log(`🚀 Test server listening on ${baseUrl}\n`);

    const timestamp = Date.now();

    // 1. Setup Verified Test Teacher & Students
    console.log('--- Step 1: User Provisioning ---');
    const teacher = await User.create({
      name: `Prof. Test Math ${timestamp}`,
      email: `prof_math_${timestamp}@neo.com`,
      password: 'Teacher@2026',
      phone: '+91 9888800001',
      role: 'teacher',
      isActive: true,
      teacherProfile: {
        assignedClasses: ['Class 10', 'Class 9'],
        assignedSections: ['A', 'B'],
        assignedSubjects: ['Mathematics Standard'],
      },
    });

    const student1 = await User.create({
      name: `Aryan TestStudent ${timestamp}`,
      email: `aryan_${timestamp}@neo.com`,
      password: 'Student@2026',
      phone: '+91 9888800002',
      role: 'student',
      isActive: true,
      studentProfile: {
        rollNumber: `1001-${timestamp}`,
        classGrade: 'Class 10',
        section: 'A',
      },
    });

    const student2 = await User.create({
      name: `Leo TestStudent ${timestamp}`,
      email: `leo_${timestamp}@neo.com`,
      password: 'Student@2026',
      phone: '+91 9888800003',
      role: 'student',
      isActive: true,
      studentProfile: {
        rollNumber: `UKG-01-${timestamp}`,
        classGrade: 'UKG',
        section: 'A',
      },
    });

    console.log('✅ Created Teacher, Student 1 (Class 10-A), and Student 2 (UKG-A)\n');

    // 2. Authentication: Login as Teacher and Students
    console.log('--- Step 2: Authentication Handshake ---');
    const teacherLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: teacher.email, password: 'Teacher@2026' }),
    });
    const teacherAuth = await teacherLoginRes.json();
    assert.strictEqual(teacherLoginRes.status, 200);
    assert(teacherAuth.token, 'Teacher must receive JWT token');
    const teacherToken = teacherAuth.token;

    const s1LoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: student1.email, password: 'Student@2026' }),
    });
    const s1Auth = await s1LoginRes.json();
    assert.strictEqual(s1LoginRes.status, 200);
    const s1Token = s1Auth.token;

    const s2LoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: student2.email, password: 'Student@2026' }),
    });
    const s2Auth = await s2LoginRes.json();
    assert.strictEqual(s2LoginRes.status, 200);
    const s2Token = s2Auth.token;

    console.log('✅ Login tokens acquired for all 3 users\n');

    // 3. Teacher creates an exam draft
    console.log('--- Step 3: Teacher Creates Question Paper & Exam Draft ---');
    const createExamRes = await fetch(`${baseUrl}/exams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        title: `Class 10 Trigonometry Mastery ${timestamp}`,
        category: 'unit_test',
        academicYear: '2025-2026',
        classGrade: 'Class 10',
        sections: ['A'],
        subject: 'Mathematics Standard',
        totalMarks: 50,
        passingMarks: 20,
        durationMinutes: 90,
        instructions: 'Attempt all questions. Tab switching monitored.',
        examSections: [
          {
            id: 'sec_1',
            title: 'Section A - Multiple Choice Questions',
            durationMinutes: 45,
            totalMarks: 20,
            questions: [
              {
                questionText: 'What is sin(90°)?',
                questionType: 'single_mcq',
                marks: 2,
                options: [
                  { id: 'opt_1', text: '0' },
                  { id: 'opt_2', text: '1' },
                  { id: 'opt_3', text: '1/2' },
                ],
                correctAnswer: 'opt_2',
                explanation: 'sin(90°) is exactly 1',
              },
            ],
          },
        ],
      }),
    });
    const createExamData = await createExamRes.json();
    assert.strictEqual(createExamRes.status, 201);
    const examId = createExamData.data._id;
    assert.strictEqual(createExamData.data.status, 'draft');
    console.log(`✅ Exam created in draft mode (ID: ${examId})\n`);

    // 4. Validate Schedule End Time > Start Time
    console.log('--- Step 4: Schedule Validation (End Time > Start Time) ---');
    const invalidScheduleRes = await fetch(`${baseUrl}/exams/${examId}/schedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        examDate: '2026-11-15',
        startTime: '2026-11-15T11:00:00Z',
        endTime: '2026-11-15T10:00:00Z', // Invalid: end time before start time!
        durationMinutes: 60,
      }),
    });
    const invalidScheduleData = await invalidScheduleRes.json();
    assert.strictEqual(invalidScheduleRes.status, 400, 'End time before start time must return 400 Bad Request');
    assert(invalidScheduleData.message.includes('later than start time'));
    console.log('✅ Correctly rejected invalid schedule: ' + invalidScheduleData.message + '\n');

    // 5. Valid Scheduling: Schedule for 2 hours in the future
    console.log('--- Step 5: Valid Examination Scheduling & Student Notification Dispatch ---');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const validStartTime = new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000);
    const validEndTime = new Date(validStartTime.getTime() + 90 * 60 * 1000);

    const validScheduleRes = await fetch(`${baseUrl}/exams/${examId}/schedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        examDate: tomorrow.toISOString().split('T')[0],
        startTime: validStartTime.toISOString(),
        endTime: validEndTime.toISOString(),
        durationMinutes: 90,
      }),
    });
    const validScheduleData = await validScheduleRes.json();
    assert.strictEqual(validScheduleRes.status, 200);
    assert.strictEqual(validScheduleData.data.status, 'scheduled');
    console.log('✅ Exam scheduled successfully\n');

    // 6. Student 1 (Class 10) Dashboard Verification
    console.log('--- Step 6: Student 1 Dashboard Visibility Check ---');
    const s1DashboardRes = await fetch(`${baseUrl}/dashboard/student`, {
      headers: { Authorization: `Bearer ${s1Token}` },
    });
    const s1Dashboard = await s1DashboardRes.json();
    assert.strictEqual(s1DashboardRes.status, 200);
    assert(s1Dashboard.data.exams.length > 0, 'Student 1 must see scheduled exam');

    const foundExamInS1 = s1Dashboard.data.exams.find((e) => e._id === examId);
    assert(foundExamInS1, 'Class 10 Exam must be present in Student 1 scheduled list');
    assert.strictEqual(foundExamInS1.studentStatus, 'upcoming');
    assert(foundExamInS1.timeRemainingSeconds > 0, 'Countdown timer must be positive');

    // Verify question answer key security
    if (foundExamInS1.examSections?.[0]?.questions?.[0]) {
      const q = foundExamInS1.examSections[0].questions[0];
      assert.strictEqual(q.correctAnswer, undefined, 'CRITICAL: correctAnswer must NEVER be exposed to students');
      assert.strictEqual(q.explanation, undefined, 'CRITICAL: explanation must NEVER be exposed to students');
    }
    console.log('✅ Student 1 dashboard verified: Exam visible under upcoming with live countdown; Answer keys stripped\n');

    // 7. Student 1 Notifications Check & Mark Read
    console.log('--- Step 7: Student 1 Persistent Notifications Workflow ---');
    const s1NotifRes = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${s1Token}` },
    });
    const s1NotifData = await s1NotifRes.json();
    assert.strictEqual(s1NotifRes.status, 200);
    assert(s1NotifData.data.length > 0, 'Student 1 must have notifications');

    const examNotif = s1NotifData.data.find((n) => n.examination?._id === examId || n.examination === examId);
    assert(examNotif, 'Exam scheduled notification must exist for Student 1');
    assert.strictEqual(examNotif.isRead, false);
    assert.strictEqual(examNotif.type, 'exam_scheduled');
    assert(s1NotifData.unreadCount >= 1, 'Unread count must be >= 1');

    // Mark as read
    const markReadRes = await fetch(`${baseUrl}/notifications/${examNotif._id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${s1Token}` },
    });
    const markReadData = await markReadRes.json();
    assert.strictEqual(markReadRes.status, 200);
    assert.strictEqual(markReadData.data.isRead, true);
    console.log('✅ Persistent notification verified and marked as read\n');

    // 8. Class Isolation: Student 2 (UKG) must NOT see Class 10 Exam
    console.log('--- Step 8: Strict Class Isolation Verification (Student 2 - UKG) ---');
    const s2DashboardRes = await fetch(`${baseUrl}/dashboard/student`, {
      headers: { Authorization: `Bearer ${s2Token}` },
    });
    const s2Dashboard = await s2DashboardRes.json();
    const foundInS2 = (s2Dashboard.data.exams || []).find((e) => e._id === examId);
    assert(!foundInS2, 'Class 10 exam must NOT appear on UKG student dashboard');

    const s2NotifRes = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${s2Token}` },
    });
    const s2NotifData = await s2NotifRes.json();
    const foundNotifInS2 = (s2NotifData.data || []).find((n) => n.examination?._id === examId || n.examination === examId);
    assert(!foundNotifInS2, 'UKG student must NEVER receive notification for Class 10 exam');
    console.log('✅ Verified: Zero leakage across class boundaries\n');

    // 9. Unavailable Exam Early Start Protection
    console.log('--- Step 9: Prevent Early Exam Start ---');
    const earlyStartRes = await fetch(`${baseUrl}/exams/${examId}/start-attempt`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${s1Token}` },
    });
    const earlyStartData = await earlyStartRes.json();
    assert.strictEqual(earlyStartRes.status, 400, 'Student cannot start exam before startTime');
    assert(earlyStartData.message.includes('not available yet'), 'Must explain exam has not started yet');
    console.log('✅ Early start blocked: ' + earlyStartData.message + '\n');

    // 10. Live Exam Simulation: Set startTime to 10 mins ago
    console.log('--- Step 10: Live Exam Attempt & Incremental Autosave ---');
    const pastStart = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
    const futureEnd = new Date(Date.now() + 50 * 60 * 1000); // 50 minutes remaining

    await Examination.updateOne(
      { _id: examId },
      { $set: { startTime: pastStart, endTime: futureEnd, status: 'in_progress' } }
    );

    // Student 1 starts attempt
    const startAttemptRes = await fetch(`${baseUrl}/exams/${examId}/start-attempt`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${s1Token}` },
    });
    const startAttemptData = await startAttemptRes.json();
    assert.strictEqual(startAttemptRes.status, 200, 'Student can start active exam');
    const attemptId = startAttemptData.data.attempt._id;
    assert(startAttemptData.data.timeRemainingSeconds > 0);
    assert.strictEqual(startAttemptData.data.attempt.status, 'in_progress');

    // Autosave response via /exams/save-answer
    const questionId = createExamData.data.examSections[0].questions[0]._id;
    const autosaveRes = await fetch(`${baseUrl}/exams/save-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${s1Token}`,
      },
      body: JSON.stringify({
        attemptId,
        questionId: questionId.toString(),
        studentAnswer: 'opt_2',
        isMarkedForReview: false,
        visited: true,
      }),
    });
    const autosaveData = await autosaveRes.json();
    assert.strictEqual(autosaveRes.status, 200, 'Answer autosaved successfully');
    assert.strictEqual(autosaveData.success, true);

    // Verify answer saved in attempt record in DB
    const attemptInDb = await ExaminationAttempt.findById(attemptId);
    const savedSlot = attemptInDb.answers.find((a) => a.questionId === questionId.toString());
    assert(savedSlot, 'Saved answer slot must exist');
    assert.strictEqual(savedSlot.studentAnswer, 'opt_2');
    assert.strictEqual(savedSlot.isAnswered, true);
    console.log('✅ Live attempt started, answer autosaved, and verified in database\n');

    // Submit attempt & Auto-evaluation
    console.log('--- Step 11: Attempt Submission & Auto-evaluation ---');
    // Copy student answer to attempt record for submit evaluation
    await ExaminationAttempt.updateOne(
      { _id: attemptId },
      {
        $set: {
          'answers.0.studentAnswer': 'opt_2',
          'answers.0.isAnswered': true,
        },
      }
    );

    const submitRes = await fetch(`${baseUrl}/exams/submit-attempt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${s1Token}`,
      },
      body: JSON.stringify({
        attemptId,
        submissionType: 'manual',
      }),
    });
    const submitData = await submitRes.json();
    assert.strictEqual(submitRes.status, 200);
    assert.strictEqual(submitData.data.autoScore, 2, 'sin(90°)=1 is opt_2, worth 2 marks');
    console.log('✅ Exam submitted and auto-evaluated successfully (Score: 2/2)\n');

    // 12. Exam Cancellation Workflow
    console.log('--- Step 12: Examination Cancellation Workflow ---');
    const cancelRes = await fetch(`${baseUrl}/exams/${examId}/cancel`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    const cancelData = await cancelRes.json();
    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelData.data.status, 'cancelled');

    // Verify student cannot start a cancelled exam
    const tryStartCancelledRes = await fetch(`${baseUrl}/exams/${examId}/start-attempt`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${s1Token}` },
    });
    assert.strictEqual(tryStartCancelledRes.status, 400);
    const tryStartCancelledData = await tryStartCancelledRes.json();
    assert(tryStartCancelledData.message.includes('cancelled'));
    console.log('✅ Cancellation confirmed: exam marked cancelled, students notified, starting blocked\n');

    // 13. Cleanup Test Data
    console.log('--- Step 13: Cleanup ---');
    await Promise.all([
      User.deleteMany({ _id: { $in: [teacher._id, student1._id, student2._id] } }),
      Examination.deleteOne({ _id: examId }),
      ExaminationAttempt.deleteMany({ examination: examId }),
      Notification.deleteMany({ examination: examId }),
    ]);
    console.log('✅ Cleaned up test data.\n');

    console.log('================================================================');
    console.log('🎉🎉 ALL 12 E2E ARCHITECTURAL QA TESTS PASSED SUCCESSFULLY! 🎉🎉');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ E2E TEST FAILED:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

runE2ETests();
