import dotenv from 'dotenv';
dotenv.config();

import assert from 'assert';
import mongoose from 'mongoose';
import User from './src/models/userModel.js';
import Examination from './src/models/examinationModel.js';
import Notification from './src/models/notificationModel.js';
import ExaminationAttempt from './src/models/examinationAttemptModel.js';
import {
  notifyStudentsExamScheduled,
  notifyStudentsExamCancelled,
  notifyStudentsResultsPublished,
  findEligibleStudents,
} from './src/services/notificationService.js';

console.log('🧪 Starting Examination & Notification Architecture Test Suite...\n');

async function runTests() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB.\n');

    // 1. Setup Test Users
    console.log('--- Test 1: Setup Teacher & Multi-Class Students ---');
    const timestamp = Date.now();
    const teacher = await User.create({
      name: `Test Teacher ${timestamp}`,
      email: `teacher_${timestamp}@test.com`,
      password: 'Teacher@2026',
      phone: '+91 9900000001',
      role: 'teacher',
      isActive: true,
      teacherProfile: {
        assignedClasses: ['Class 10', 'Class 8'],
        assignedSections: ['A', 'B'],
        assignedSubjects: ['Mathematics Standard', 'Science'],
      },
    });

    const studentClass10 = await User.create({
      name: `Student Class10 ${timestamp}`,
      email: `student10_${timestamp}@test.com`,
      password: 'Student@2026',
      phone: '+91 9900000002',
      role: 'student',
      isActive: true,
      studentProfile: {
        rollNumber: `R10-${timestamp}`,
        classGrade: 'Class 10',
        section: 'A',
      },
    });

    const studentClass8 = await User.create({
      name: `Student Class8 ${timestamp}`,
      email: `student8_${timestamp}@test.com`,
      password: 'Student@2026',
      phone: '+91 9900000003',
      role: 'student',
      isActive: true,
      studentProfile: {
        rollNumber: `R8-${timestamp}`,
        classGrade: 'Class 8',
        section: 'B',
      },
    });

    const studentOtherSection = await User.create({
      name: `Student Section C ${timestamp}`,
      email: `student_c_${timestamp}@test.com`,
      password: 'Student@2026',
      phone: '+91 9900000004',
      role: 'student',
      isActive: true,
      studentProfile: {
        rollNumber: `R10C-${timestamp}`,
        classGrade: 'Class 10',
        section: 'C',
      },
    });

    console.log('✅ Created test teacher and students across Class 10-A, Class 8-B, Class 10-C\n');

    // 2. Create Exam for Class 10 Section A
    console.log('--- Test 2: Teacher Examination Creation & Draft Persistence ---');
    const now = new Date();
    const startTimeFuture = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    const endTimeFuture = new Date(startTimeFuture.getTime() + 90 * 60 * 1000); // 90 mins later

    const exam10 = await Examination.create({
      title: `Mathematics Unit Test ${timestamp}`,
      category: 'unit_test',
      classGrade: 'Class 10',
      sections: ['A'],
      subject: 'Mathematics Standard',
      description: 'Midterm assessment',
      instructions: '1. All questions compulsory. 2. Tab switches tracked.',
      createdBy: teacher._id,
      status: 'draft',
      examDate: new Date(now.toISOString().split('T')[0]),
      startTime: startTimeFuture,
      endTime: endTimeFuture,
      durationMinutes: 90,
      totalMarks: 50,
      passingMarks: 20,
      examSections: [
        {
          id: 'sec_1',
          title: 'Section A - Objective',
          durationMinutes: 45,
          totalMarks: 20,
          questions: [
            {
              questionText: 'What is the root of x^2 - 4 = 0?',
              questionType: 'single_mcq',
              marks: 2,
              options: [
                { id: 'opt_1', text: '+2' },
                { id: 'opt_2', text: '-2' },
                { id: 'opt_3', text: '±2' },
              ],
              correctAnswer: 'opt_3',
              explanation: 'x = sqrt(4) = ±2',
            },
          ],
        },
      ],
    });

    assert.strictEqual(exam10.status, 'draft', 'Newly created exam must default to draft');
    console.log('✅ Created draft exam with question and answer keys\n');

    // 3. Eligible Students Matching Verification
    console.log('--- Test 3: Eligible Student Targeting & Isolation ---');
    const eligibleFor10A = await findEligibleStudents(exam10);
    const eligibleIds = eligibleFor10A.map((s) => s._id.toString());

    assert(eligibleIds.includes(studentClass10._id.toString()), 'Class 10 Section A student MUST be eligible');
    assert(!eligibleIds.includes(studentClass8._id.toString()), 'Class 8 student must NOT be eligible for Class 10 exam');
    assert(!eligibleIds.includes(studentOtherSection._id.toString()), 'Class 10 Section C student must NOT be eligible when exam is limited to Section A');
    console.log('✅ Correct students matched: Only Class 10-A eligible, Class 8 and Section C excluded\n');

    // 4. Scheduling & Notification Workflow
    console.log('--- Test 4: Examination Scheduling & Notification Dispatch ---');
    exam10.status = 'scheduled';
    await exam10.save();

    const dispatchResult = await notifyStudentsExamScheduled(exam10, false);
    assert(dispatchResult.count >= 1, 'Notifications must be dispatched to eligible students');

    const notif = await Notification.findOne({
      recipient: studentClass10._id,
      examination: exam10._id,
    });
    assert(notif, 'Persistent notification record must exist in MongoDB for eligible student');
    assert.strictEqual(notif.isRead, false, 'New notification must be unread');
    assert.strictEqual(notif.type, 'exam_scheduled');
    assert.strictEqual(notif.examMetadata.examTitle, exam10.title);
    assert.strictEqual(notif.examMetadata.totalMarks, 50);

    const otherNotif = await Notification.findOne({
      recipient: studentClass8._id,
      examination: exam10._id,
    });
    assert(!otherNotif, 'No notification should exist for students of other classes');
    console.log('✅ Notification successfully persisted in MongoDB with correct metadata for eligible student only\n');

    // 5. Deduplication Check on Re-scheduling with same schedule
    console.log('--- Test 5: Notification Deduplication Guard ---');
    const secondDispatch = await notifyStudentsExamScheduled(exam10, false);
    assert.strictEqual(secondDispatch.count, 0, 'Must NOT create duplicate notification for unchanged exam schedule');

    const notifCount = await Notification.countDocuments({
      recipient: studentClass10._id,
      examination: exam10._id,
    });
    assert.strictEqual(notifCount, 1, 'Exactly 1 notification should exist, no duplicates');
    console.log('✅ Duplicate notification prevention verified\n');

    // 6. Reschedule Notification on Date/Time Change
    console.log('--- Test 6: Reschedule Detection & Notification Update ---');
    const rescheduledStart = new Date(startTimeFuture.getTime() + 24 * 60 * 60 * 1000); // Next day
    const rescheduledEnd = new Date(rescheduledStart.getTime() + 90 * 60 * 1000);
    exam10.startTime = rescheduledStart;
    exam10.endTime = rescheduledEnd;
    await exam10.save();

    await notifyStudentsExamScheduled(exam10, true);

    const updatedNotif = await Notification.findOne({
      recipient: studentClass10._id,
      examination: exam10._id,
    });
    assert.strictEqual(updatedNotif.type, 'exam_rescheduled');
    assert(updatedNotif.title.includes('Rescheduled'));
    assert.strictEqual(updatedNotif.isRead, false, 'Updated reschedule notification should be unread');
    console.log('✅ Schedule change notification sent with updated timestamps\n');

    // 7. Exam Cancellation Notification
    console.log('--- Test 7: Exam Cancellation Workflow ---');
    await notifyStudentsExamCancelled(exam10);

    const cancelNotif = await Notification.findOne({
      recipient: studentClass10._id,
      examination: exam10._id,
    });
    assert.strictEqual(cancelNotif.type, 'exam_cancelled');
    assert(cancelNotif.title.includes('Cancelled'));
    console.log('✅ Exam cancellation notification verified\n');

    // 8. Result Publication Notification
    console.log('--- Test 8: Result Publication Notification ---');
    await notifyStudentsResultsPublished(exam10);

    const resultsNotif = await Notification.findOne({
      recipient: studentClass10._id,
      examination: exam10._id,
      type: 'results_published',
    });
    assert(resultsNotif, 'Results published notification must exist');
    console.log('✅ Result publication notification verified\n');

    // 9. Clean up test records
    console.log('--- Cleanup Test Records ---');
    await Promise.all([
      User.deleteMany({ _id: { $in: [teacher._id, studentClass10._id, studentClass8._id, studentOtherSection._id] } }),
      Examination.deleteOne({ _id: exam10._id }),
      Notification.deleteMany({ examination: exam10._id }),
    ]);
    console.log('✅ Test data cleaned up.\n');

    console.log('🎉 ALL EXAMINATION WORKFLOW & NOTIFICATION QA TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTests();
