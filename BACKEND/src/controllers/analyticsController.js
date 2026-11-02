import Examination from '../models/examinationModel.js';
import ExaminationAttempt from '../models/examinationAttemptModel.js';
import User from '../models/userModel.js';
import Question from '../models/questionModel.js';
import mongoose from 'mongoose';

/**
 * Superadmin & Admin School-Wide Analytics
 */
export const getAdminAnalyticsReport = async (req, res, next) => {
  try {
    const { classGrade, subject, teacherId, startDate, endDate } = req.query;

    const examMatch = {};
    if (classGrade) examMatch.classGrade = classGrade;
    if (subject) examMatch.subject = subject;
    if (teacherId) examMatch.createdBy = new mongoose.Types.ObjectId(teacherId);
    if (startDate || endDate) {
      examMatch.createdAt = {};
      if (startDate) examMatch.createdAt.$gte = new Date(startDate);
      if (endDate) examMatch.createdAt.$lte = new Date(endDate);
    }

    // 1. Overall Key Performance Indicators
    const totalExams = await Examination.countDocuments(examMatch);
    
    // Aggregation over attempts matching these exams
    const attemptsAggregation = await ExaminationAttempt.aggregate([
      {
        $lookup: {
          from: 'examinations',
          localField: 'examination',
          foreignField: '_id',
          as: 'exam',
        },
      },
      { $unwind: '$exam' },
      {
        $match: {
          ...(classGrade ? { 'exam.classGrade': classGrade } : {}),
          ...(subject ? { 'exam.subject': subject } : {}),
          ...(teacherId ? { 'exam.createdBy': new mongoose.Types.ObjectId(teacherId) } : {}),
          status: { $in: ['submitted', 'auto_submitted', 'evaluated', 'result_published'] },
        },
      },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          averageScore: { $avg: '$score.percentage' },
          passedCount: {
            $sum: { $cond: ['$score.isPassed', 1, 0] },
          },
          highestScore: { $max: '$score.percentage' },
          lowestScore: { $min: '$score.percentage' },
        },
      },
    ]);

    const kpi = attemptsAggregation[0] || {
      totalAttempts: 0,
      averageScore: 0,
      passedCount: 0,
      highestScore: 0,
      lowestScore: 0,
    };

    // 2. Class-Wise Performance Breakdown
    const classPerformance = await ExaminationAttempt.aggregate([
      {
        $lookup: {
          from: 'examinations',
          localField: 'examination',
          foreignField: '_id',
          as: 'exam',
        },
      },
      { $unwind: '$exam' },
      {
        $match: {
          status: { $in: ['submitted', 'auto_submitted', 'evaluated', 'result_published'] },
        },
      },
      {
        $group: {
          _id: '$exam.classGrade',
          attempts: { $sum: 1 },
          averagePercentage: { $avg: '$score.percentage' },
          passed: { $sum: { $cond: ['$score.isPassed', 1, 0] } },
        },
      },
      {
        $project: {
          classGrade: '$_id',
          attempts: 1,
          averagePercentage: { $round: ['$averagePercentage', 1] },
          passPercentage: {
            $round: [
              { $multiply: [{ $divide: ['$passed', { $cond: [{ $eq: ['$attempts', 0] }, 1, '$attempts'] }] }, 100] },
              1,
            ],
          },
        },
      },
      { $sort: { classGrade: 1 } },
    ]);

    // 3. Subject-Wise Performance
    const subjectPerformance = await ExaminationAttempt.aggregate([
      {
        $lookup: {
          from: 'examinations',
          localField: 'examination',
          foreignField: '_id',
          as: 'exam',
        },
      },
      { $unwind: '$exam' },
      {
        $match: {
          status: { $in: ['submitted', 'auto_submitted', 'evaluated', 'result_published'] },
        },
      },
      {
        $group: {
          _id: '$exam.subject',
          attempts: { $sum: 1 },
          averageScore: { $avg: '$score.percentage' },
        },
      },
      {
        $project: {
          subject: '$_id',
          attempts: 1,
          averageScore: { $round: ['$averageScore', 1] },
        },
      },
      { $sort: { attempts: -1 } },
    ]);

    // 4. Top Performers School-Wide
    const topPerformers = await ExaminationAttempt.find({
      status: { $in: ['submitted', 'auto_submitted', 'evaluated', 'result_published'] },
    })
      .populate('student', 'name schoolId studentProfile profilePhoto')
      .populate('examination', 'title subject classGrade')
      .sort({ 'score.percentage': -1 })
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        kpi: {
          examsConducted: totalExams,
          studentsAttempted: kpi.totalAttempts,
          averageScore: Number((kpi.averageScore || 0).toFixed(1)),
          passPercentage: kpi.totalAttempts > 0 ? Number(((kpi.passedCount / kpi.totalAttempts) * 100).toFixed(1)) : 0,
          highestScore: Number((kpi.highestScore || 0).toFixed(1)),
          lowestScore: Number((kpi.lowestScore || 0).toFixed(1)),
        },
        classPerformance,
        subjectPerformance,
        topPerformers: topPerformers.map((p) => ({
          studentName: p.student?.name || 'Student',
          schoolId: p.student?.schoolId || '',
          classGrade: p.student?.studentProfile?.classGrade || p.examination?.classGrade || '',
          examTitle: p.examination?.title || '',
          subject: p.examination?.subject || '',
          score: p.score?.totalScore,
          maxMarks: p.score?.maxMarks,
          percentage: Number((p.score?.percentage || 0).toFixed(1)),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Student "My Report" Summary with real MongoDB data
 */
export const getStudentPerformanceReport = async (req, res, next) => {
  try {
    const studentId = req.params.studentId === 'me' || !req.params.studentId ? req.user._id : req.params.studentId;

    // Student can only access their own report
    if (req.user.role === 'student' && req.user._id.toString() !== studentId.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own report' });
    }

    const studentUser = await User.findById(studentId);
    if (!studentUser) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Only published results or evaluated attempts
    const attempts = await ExaminationAttempt.find({
      student: studentId,
      status: { $in: ['submitted', 'auto_submitted', 'evaluated', 'result_published'] },
    })
      .populate('examination', 'title subject classGrade totalMarks passingMarks isResultPublished examCode')
      .sort({ createdAt: -1 });

    const publishedAttempts = attempts.filter((a) => a.isResultPublished || a.status === 'result_published');

    // Subject breakdown
    const subjectScores = {};
    const trendOverTime = [];

    publishedAttempts.forEach((att) => {
      const sub = att.examination?.subject || 'General';
      if (!subjectScores[sub]) {
        subjectScores[sub] = { totalPct: 0, count: 0, exams: [] };
      }
      const pct = att.score?.percentage || 0;
      subjectScores[sub].totalPct += pct;
      subjectScores[sub].count += 1;
      subjectScores[sub].exams.push({
        examTitle: att.examination?.title,
        percentage: pct,
        score: att.score?.totalScore,
        maxMarks: att.score?.maxMarks,
        isPassed: att.score?.isPassed,
        submittedAt: att.submittedAt,
      });

      trendOverTime.push({
        date: att.submittedAt ? new Date(att.submittedAt).toLocaleDateString() : 'Recent',
        examTitle: att.examination?.title || 'Exam',
        score: att.score?.totalScore || 0,
        percentage: Number((att.score?.percentage || 0).toFixed(1)),
      });
    });

    const subjectBreakdown = Object.keys(subjectScores).map((sub) => ({
      subject: sub,
      averagePercentage: Number((subjectScores[sub].totalPct / subjectScores[sub].count).toFixed(1)),
      examsAttempted: subjectScores[sub].count,
    }));

    // Strengths & Weaknesses topic identification from questions
    const topicStats = {};
    for (const att of publishedAttempts) {
      for (const ans of att.answers || []) {
        if (ans.questionId) {
          const q = await Question.findById(ans.questionId).select('topic subject marks').lean();
          if (q && q.topic) {
            if (!topicStats[q.topic]) {
              topicStats[q.topic] = { total: 0, correct: 0, subject: q.subject };
            }
            topicStats[q.topic].total += 1;
            if (ans.marksAwarded > 0) topicStats[q.topic].correct += 1;
          }
        }
      }
    }

    const strengths = [];
    const weakTopics = [];
    Object.keys(topicStats).forEach((topic) => {
      const accuracy = Math.round((topicStats[topic].correct / topicStats[topic].total) * 100);
      const item = { topic, subject: topicStats[topic].subject, accuracy, questionsAttempted: topicStats[topic].total };
      if (accuracy >= 70) strengths.push(item);
      else if (accuracy < 50) weakTopics.push(item);
    });

    res.status(200).json({
      success: true,
      data: {
        student: {
          name: studentUser.name,
          email: studentUser.email,
          schoolId: studentUser.schoolId,
          profilePhoto: studentUser.profilePhoto,
          classGrade: studentUser.studentProfile?.classGrade,
          rollNumber: studentUser.studentProfile?.rollNumber,
          section: studentUser.studentProfile?.section,
        },
        summary: {
          totalExamsAttempted: publishedAttempts.length,
          overallAveragePercentage:
            publishedAttempts.length > 0
              ? Number(
                  (
                    publishedAttempts.reduce((acc, a) => acc + (a.score?.percentage || 0), 0) /
                    publishedAttempts.length
                  ).toFixed(1)
                )
              : 0,
          passedExamsCount: publishedAttempts.filter((a) => a.score?.isPassed).length,
        },
        subjectBreakdown,
        trendOverTime: trendOverTime.reverse(),
        strengths,
        weakTopics,
        examHistory: publishedAttempts.map((a) => ({
          attemptId: a._id,
          examId: a.examination?._id,
          examTitle: a.examination?.title,
          examCode: a.examination?.examCode,
          subject: a.examination?.subject,
          score: a.score?.totalScore,
          maxMarks: a.score?.maxMarks,
          percentage: Number((a.score?.percentage || 0).toFixed(1)),
          isPassed: a.score?.isPassed,
          submittedAt: a.submittedAt,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};
