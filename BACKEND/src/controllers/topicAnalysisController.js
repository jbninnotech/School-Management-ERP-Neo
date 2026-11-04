import ExaminationAttempt from '../models/examinationAttemptModel.js';
import Examination from '../models/examinationModel.js';
import Question from '../models/questionModel.js';
import Category from '../models/categoryModel.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';

/**
 * 4-Level Drill-Down Chapter & Topic Analysis
 * Student (own data), Teacher (assigned subjects/classes), Admin (school-wide)
 *
 * Query Params:
 * - studentId: optional (defaults to current student if student, or filters specific student)
 * - classGrade: optional
 * - subject: optional
 * - level: 'unit' | 'topic' | 'subtopic' | 'child' (optional filter)
 * - search: string (search box to find a topic)
 */
export const getChapterTopicAnalysis = async (req, res, next) => {
  try {
    const { studentId, classGrade, subject, level, search } = req.query;

    let targetStudentId = null;
    if (req.user.role === 'student') {
      targetStudentId = req.user._id;
    } else if (studentId && studentId !== 'all') {
      targetStudentId = new mongoose.Types.ObjectId(studentId);
    }

    // Match only published attempts
    const attemptMatch = {
      status: { $in: ['submitted', 'auto_submitted', 'evaluated', 'result_published'] },
      $or: [{ isResultPublished: true }, { status: 'result_published' }],
    };

    if (targetStudentId) {
      attemptMatch.student = targetStudentId;
    }

    // Fetch published attempts
    const attempts = await ExaminationAttempt.find(attemptMatch)
      .populate('examination', 'title subject classGrade totalMarks isResultPublished')
      .lean();

    if (attempts.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          hierarchyTree: [],
          levelBreakdown: { unit: [], topic: [], subtopic: [], child: [] },
          weakAreas: [],
          summary: { totalAttempts: 0, totalQuestionsScored: 0, averagePercentage: 0 },
        },
      });
    }

    // Extract all question answers
    const questionStatsMap = {}; // questionId -> { marksAwarded, maxMarks, attemptsCount }
    attempts.forEach((att) => {
      // filter classGrade and subject if provided
      if (classGrade && att.examination?.classGrade !== classGrade) return;
      if (subject && att.examination?.subject?.toLowerCase() !== subject.toLowerCase()) return;

      (att.answers || []).forEach((ans) => {
        if (!ans.questionId) return;
        const qId = ans.questionId.toString();
        if (!questionStatsMap[qId]) {
          questionStatsMap[qId] = { scoredMarks: 0, totalMarks: 0, attemptsCount: 0 };
        }
        questionStatsMap[qId].scoredMarks += Number(ans.marksAwarded) || 0;
        // max marks of question
        questionStatsMap[qId].totalMarks += Number(ans.marksAwarded > 0 ? ans.marksAwarded : 1);
        questionStatsMap[qId].attemptsCount += 1;
      });
    });

    const questionIds = Object.keys(questionStatsMap).filter((id) => mongoose.Types.ObjectId.isValid(id));
    const questions = await Question.find({ _id: { $in: questionIds } })
      .select('unitId topicId subTopicId childTopicId chapter topic subject classGrade marks')
      .lean();

    // Re-adjust total marks according to real question marks
    questions.forEach((q) => {
      const qId = q._id.toString();
      if (questionStatsMap[qId]) {
        questionStatsMap[qId].totalMarks = (q.marks || 1) * questionStatsMap[qId].attemptsCount;
      }
    });

    // Map stats to categories
    // Each question may link to unitId, topicId, subTopicId, childTopicId
    const categoryStats = {}; // categoryId -> { scoredMarks, totalMarks, attemptsCount, questionsCount }

    const addCatScore = (catId, scored, total, count) => {
      if (!catId) return;
      const cid = catId.toString();
      if (!categoryStats[cid]) {
        categoryStats[cid] = { scoredMarks: 0, totalMarks: 0, attemptsCount: 0 };
      }
      categoryStats[cid].scoredMarks += scored;
      categoryStats[cid].totalMarks += total;
      categoryStats[cid].attemptsCount += count;
    };

    questions.forEach((q) => {
      const stat = questionStatsMap[q._id.toString()];
      if (!stat) return;

      if (q.unitId) addCatScore(q.unitId, stat.scoredMarks, stat.totalMarks, stat.attemptsCount);
      if (q.topicId) addCatScore(q.topicId, stat.scoredMarks, stat.totalMarks, stat.attemptsCount);
      if (q.subTopicId) addCatScore(q.subTopicId, stat.scoredMarks, stat.totalMarks, stat.attemptsCount);
      if (q.childTopicId) addCatScore(q.childTopicId, stat.scoredMarks, stat.totalMarks, stat.attemptsCount);
    });

    // Load category details
    const catIds = Object.keys(categoryStats).map((id) => new mongoose.Types.ObjectId(id));
    const categories = await Category.find({ _id: { $in: catIds }, isDeleted: false })
      .populate('path', 'name level')
      .lean();

    const levelBreakdown = {
      unit: [],
      topic: [],
      subtopic: [],
      child: [],
    };

    const weakAreas = [];

    categories.forEach((cat) => {
      const cid = cat._id.toString();
      const stat = categoryStats[cid];
      const percentage = stat.totalMarks > 0 ? Math.round((stat.scoredMarks / stat.totalMarks) * 100) : 0;

      // Color label logic:
      // Strong (75%+), Average (40-74%), Weak (below 40%)
      let performanceLabel = 'Weak';
      let colorClass = 'danger';
      if (percentage >= 75) {
        performanceLabel = 'Strong';
        colorClass = 'success';
      } else if (percentage >= 40) {
        performanceLabel = 'Average';
        colorClass = 'warning';
      }

      // Build path string:
      const ancestorNames = (cat.path || []).map((p) => p.name);
      ancestorNames.push(cat.name);
      const fullPath = ancestorNames.join(' > ');

      // Filter by search query if supplied
      if (search && search.trim()) {
        const query = search.trim().toLowerCase();
        if (!cat.name.toLowerCase().includes(query) && !fullPath.toLowerCase().includes(query)) {
          return;
        }
      }

      const item = {
        categoryId: cat._id,
        name: cat.name,
        level: cat.level,
        subject: cat.subject,
        classGrade: cat.classGrade,
        parentId: cat.parentId,
        fullPath,
        scoredMarks: Number(stat.scoredMarks.toFixed(1)),
        totalMarks: Number(stat.totalMarks.toFixed(1)),
        percentage,
        performanceLabel,
        colorClass,
        attemptsCount: stat.attemptsCount,
      };

      if (levelBreakdown[cat.level]) {
        levelBreakdown[cat.level].push(item);
      }

      // Weak areas list: sorted lowest first showing full path and number of questions attempted
      if (percentage < 40) {
        weakAreas.push(item);
      }
    });

    // Sort weak areas lowest percentage first
    weakAreas.sort((a, b) => a.percentage - b.percentage);

    res.status(200).json({
      success: true,
      data: {
        levelBreakdown,
        weakAreas,
        totalAttempts: attempts.length,
      },
    });
  } catch (err) {
    next(err);
  }
};
