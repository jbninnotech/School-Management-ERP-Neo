import PDFDocument from 'pdfkit';
import ExaminationAttempt from '../models/examinationAttemptModel.js';
import Examination from '../models/examinationModel.js';
import User from '../models/userModel.js';
import Category from '../models/categoryModel.js';
import Question from '../models/questionModel.js';
import { formatDateTime12h } from '../utils/timeUtils.js';
import mongoose from 'mongoose';

/**
 * 1. Stream Student Performance Report / Topic Analysis PDF
 * GET /api/dashboard/student/:studentId/report/pdf
 */
export const downloadStudentReportPdf = async (req, res, next) => {
  try {
    const studentId = req.params.studentId === 'me' || !req.params.studentId ? req.user._id : req.params.studentId;

    // RBAC: student can only download their own report
    if (req.user.role === 'student' && req.user._id.toString() !== studentId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only download your own report' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Published attempts
    const attempts = await ExaminationAttempt.find({
      student: studentId,
      status: { $in: ['submitted', 'auto_submitted', 'evaluated', 'result_published'] },
    })
      .populate('examination', 'title subject classGrade totalMarks passingMarks isResultPublished examCode')
      .sort({ createdAt: -1 });

    const publishedAttempts = attempts.filter((a) => a.isResultPublished || a.status === 'result_published');

    const totalExams = publishedAttempts.length;
    const avgScore =
      totalExams > 0
        ? (publishedAttempts.reduce((acc, a) => acc + (a.score?.percentage || 0), 0) / totalExams).toFixed(1)
        : 0;
    const passedCount = publishedAttempts.filter((a) => a.score?.isPassed).length;

    // PDFKit Document
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const filename = `Student_Report_${(student.name || 'Student').replace(/\s+/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Header: School & Student Meta
    doc.fontSize(18).fillColor('#1e3a8a').text('SPRINGFIELD INTERNATIONAL SCHOOL', { align: 'center' });
    doc.fontSize(13).fillColor('#334155').text('Student Performance & Topic Analysis Report', { align: 'center' });
    doc.moveDown(0.5);

    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.8);

    // Student Information Card
    doc.fontSize(10).fillColor('#0f172a');
    doc.text(`Student Name: ${student.name}`, 40, doc.y);
    doc.text(`Admission / School ID: ${student.schoolId || 'N/A'}`);
    doc.text(`Class & Section: Grade ${student.studentProfile?.classGrade || 'N/A'} - ${student.studentProfile?.section || 'A'}`);
    doc.text(`Generated On: ${formatDateTime12h(new Date())}`);
    doc.moveDown(1);

    // Summary Metric Cards Box
    const startY = doc.y;
    doc.rect(40, startY, 515, 45).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#1e293b').fontSize(11);
    doc.text(`Total Examinations: ${totalExams}`, 55, startY + 15);
    doc.text(`Average Score: ${avgScore}%`, 220, startY + 15);
    doc.text(`Pass Rate: ${totalExams > 0 ? Math.round((passedCount / totalExams) * 100) : 0}% (${passedCount}/${totalExams})`, 380, startY + 15);
    doc.moveDown(3);

    // Examination History Table
    doc.fontSize(12).fillColor('#1e3a8a').text('Examination History', 40, doc.y);
    doc.moveDown(0.5);

    // Table Header
    let tableY = doc.y;
    doc.rect(40, tableY, 515, 20).fill('#e2e8f0');
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold');
    doc.text('Exam Code / Title', 45, tableY + 5);
    doc.text('Subject', 230, tableY + 5);
    doc.text('Score', 340, tableY + 5);
    doc.text('Percentage', 410, tableY + 5);
    doc.text('Result', 490, tableY + 5);

    tableY += 22;
    doc.font('Helvetica');

    publishedAttempts.forEach((att) => {
      if (tableY > 750) {
        doc.addPage();
        tableY = 50;
      }
      doc.fillColor('#334155').fontSize(9);
      doc.text(`${att.examination?.title || 'Exam'} (${att.examination?.examCode || 'N/A'})`, 45, tableY, { width: 175 });
      doc.text(`${att.examination?.subject || 'N/A'}`, 230, tableY);
      doc.text(`${att.score?.totalScore || 0} / ${att.score?.maxMarks || 100}`, 340, tableY);
      doc.text(`${Number(att.score?.percentage || 0).toFixed(1)}%`, 410, tableY);
      doc.fillColor(att.score?.isPassed ? '#15803d' : '#b91c1c')
        .text(att.score?.isPassed ? 'PASSED' : 'NEEDS IMPRV', 490, tableY);

      tableY += 20;
    });

    // Footer with Page Numbers
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#94a3b8').text(
        `Page ${i + 1} of ${range.count} • School ERP Authoritative Academic System`,
        40,
        800,
        { align: 'center', width: 515 }
      );
    }

    doc.end();
  } catch (err) {
    next(err);
  }
};

/**
 * 2. Download Student Exam Marks Sheet PDF
 * GET /api/exams/attempts/:attemptId/mark-sheet/pdf
 */
export const downloadExamMarkSheetPdf = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const attempt = await ExaminationAttempt.findById(attemptId)
      .populate('student')
      .populate('examination');

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Examination attempt not found' });
    }

    // RBAC: student can only download their own marksheet
    if (req.user.role === 'student' && attempt.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only download your own marks sheet' });
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const filename = `Marksheet_${(attempt.student?.name || 'Student').replace(/\s+/g, '_')}_${attempt.examination?.examCode || 'Exam'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // School Name & Official Mark Sheet Header
    doc.fontSize(18).fillColor('#1e3a8a').text('SPRINGFIELD INTERNATIONAL SCHOOL', { align: 'center' });
    doc.fontSize(13).fillColor('#334155').text('Official Student Examination Marks Sheet', { align: 'center' });
    doc.moveDown(0.5);

    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.8);

    // Meta details
    doc.fontSize(10).fillColor('#0f172a');
    doc.text(`Candidate Name: ${attempt.student?.name || 'N/A'}`, 40, doc.y);
    doc.text(`Roll / Admission No: ${attempt.student?.studentProfile?.rollNumber || attempt.student?.schoolId || 'N/A'}`);
    doc.text(`Examination: ${attempt.examination?.title || 'N/A'} (${attempt.examination?.examCode || 'N/A'})`);
    doc.text(`Subject: ${attempt.examination?.subject || 'N/A'} | Class: Grade ${attempt.examination?.classGrade || 'N/A'}`);
    doc.text(`Date & Time: ${formatDateTime12h(attempt.submittedAt || attempt.createdAt)}`);
    doc.moveDown(1);

    // Marks Breakdown Box
    const boxY = doc.y;
    doc.rect(40, boxY, 515, 60).fillAndStroke('#f8fafc', '#94a3b8');
    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold');
    doc.text(`Total Score: ${attempt.score?.totalScore || 0} / ${attempt.score?.maxMarks || 100}`, 55, boxY + 12);
    doc.text(`Percentage: ${Number(attempt.score?.percentage || 0).toFixed(1)}%`, 240, boxY + 12);
    doc.text(`Status: ${attempt.score?.isPassed ? 'PASSED' : 'FAILED'}`, 400, boxY + 12);

    doc.fontSize(9).font('Helvetica').fillColor('#475569');
    doc.text(`Submission Mode: ${attempt.submissionType || 'manual'} | Warnings: ${attempt.tabSwitchesCount || 0}`, 55, boxY + 36);
    doc.text(`Proctoring Violations: ${attempt.faceViolationCount || 0}`, 350, boxY + 36);
    doc.moveDown(4);

    // Question-by-Question Section Table
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a8a').text('Section & Question Evaluation Breakdown', 40, doc.y);
    doc.moveDown(0.5);

    let tableY = doc.y;
    doc.rect(40, tableY, 515, 20).fill('#e2e8f0');
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold');
    doc.text('#', 45, tableY + 5);
    doc.text('Section', 70, tableY + 5);
    doc.text('Question Type', 200, tableY + 5);
    doc.text('Marks Awarded', 350, tableY + 5);
    doc.text('Evaluation Status', 450, tableY + 5);

    tableY += 22;
    doc.font('Helvetica');

    (attempt.answers || []).forEach((ans, idx) => {
      if (tableY > 750) {
        doc.addPage();
        tableY = 50;
      }
      doc.fillColor('#334155').fontSize(9);
      doc.text(String(idx + 1), 45, tableY);
      doc.text(ans.sectionId || 'Section A', 70, tableY);
      doc.text(ans.questionType || 'MCQ', 200, tableY);
      doc.text(`${ans.marksAwarded || 0}`, 350, tableY);
      doc.text(ans.autoEvaluated ? 'Auto Evaluated' : 'Teacher Graded', 450, tableY);

      tableY += 18;
    });

    // Footer with Page Numbers
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#94a3b8').text(
        `Page ${i + 1} of ${range.count} • Generated by Springfield ERP System on ${formatDateTime12h(new Date())}`,
        40,
        800,
        { align: 'center', width: 515 }
      );
    }

    doc.end();
  } catch (err) {
    next(err);
  }
};
