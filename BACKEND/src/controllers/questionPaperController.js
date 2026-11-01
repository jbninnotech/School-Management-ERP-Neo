import QuestionPaper from '../models/questionPaperModel.js';
import Examination from '../models/examinationModel.js';

// 1. GET ALL QUESTION PAPERS (with filters)
export const getQuestionPapers = async (req, res, next) => {
  try {
    const { classGrade, subject, status, search } = req.query;
    const filter = { isArchived: { $ne: true } };

    // Role-based isolation: teachers only see their own papers; admin/principal see all
    if (['teacher'].includes(req.user.role)) {
      filter.createdBy = req.user._id;
    }

    if (classGrade) filter.classGrade = classGrade;
    if (subject) filter.subject = subject;
    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const papers = await QuestionPaper.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: papers.length,
      data: papers,
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET SINGLE QUESTION PAPER
export const getQuestionPaperById = async (req, res, next) => {
  try {
    const paper = await QuestionPaper.findById(req.params.id).populate('createdBy', 'name email role');
    if (!paper || paper.isArchived) {
      return res.status(404).json({ success: false, message: 'Question paper not found' });
    }

    // Role check
    if (req.user.role === 'teacher' && paper.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own question papers' });
    }

    res.status(200).json({ success: true, data: paper });
  } catch (error) {
    next(error);
  }
};

// 3. CREATE QUESTION PAPER
export const createQuestionPaper = async (req, res, next) => {
  try {
    const { title, subject, classGrade, section, questions = [], durationMinutes = 60, status = 'draft' } = req.body;

    if (!title || !subject || !classGrade) {
      return res.status(400).json({
        success: false,
        message: 'Title, subject, and classGrade are required fields.',
      });
    }

    // Compute total marks
    const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

    const paper = await QuestionPaper.create({
      title,
      subject,
      classGrade,
      section: section || 'A',
      questions,
      totalMarks,
      durationMinutes: Number(durationMinutes) || 60,
      status,
      schoolId: req.user.schoolId || 'SCH-DEFAULT',
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Question paper created successfully',
      data: paper,
    });
  } catch (error) {
    next(error);
  }
};

// 4. UPDATE QUESTION PAPER
export const updateQuestionPaper = async (req, res, next) => {
  try {
    const paper = await QuestionPaper.findById(req.params.id);
    if (!paper || paper.isArchived) {
      return res.status(404).json({ success: false, message: 'Question paper not found' });
    }

    if (req.user.role === 'teacher' && paper.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only edit your own question papers' });
    }

    const { title, subject, classGrade, section, questions, durationMinutes, status } = req.body;

    if (title) paper.title = title;
    if (subject) paper.subject = subject;
    if (classGrade) paper.classGrade = classGrade;
    if (section) paper.section = section;
    if (durationMinutes) paper.durationMinutes = Number(durationMinutes);
    if (status) paper.status = status;

    if (Array.isArray(questions)) {
      paper.questions = questions;
      paper.totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
    }

    await paper.save();

    res.status(200).json({
      success: true,
      message: 'Question paper updated successfully',
      data: paper,
    });
  } catch (error) {
    next(error);
  }
};

// 5. DUPLICATE QUESTION PAPER
export const duplicateQuestionPaper = async (req, res, next) => {
  try {
    const sourcePaper = await QuestionPaper.findById(req.params.id);
    if (!sourcePaper || sourcePaper.isArchived) {
      return res.status(404).json({ success: false, message: 'Source question paper not found' });
    }

    const newPaper = await QuestionPaper.create({
      title: `${sourcePaper.title} (Copy)`,
      subject: sourcePaper.subject,
      classGrade: sourcePaper.classGrade,
      section: sourcePaper.section,
      questions: sourcePaper.questions,
      totalMarks: sourcePaper.totalMarks,
      durationMinutes: sourcePaper.durationMinutes,
      status: 'draft',
      schoolId: req.user.schoolId || 'SCH-DEFAULT',
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Question paper duplicated successfully',
      data: newPaper,
    });
  } catch (error) {
    next(error);
  }
};

// 6. SOFT DELETE QUESTION PAPER
export const deleteQuestionPaper = async (req, res, next) => {
  try {
    const paper = await QuestionPaper.findById(req.params.id);
    if (!paper || paper.isArchived) {
      return res.status(404).json({ success: false, message: 'Question paper not found' });
    }

    if (req.user.role === 'teacher' && paper.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only delete your own question papers' });
    }

    // Check if paper is attached to any running or completed exam
    const attachedExam = await Examination.findOne({
      questionPaperId: paper._id,
      status: { $in: ['live', 'in_progress', 'completed', 'results_published'] },
    });

    if (attachedExam) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete this question paper because it is linked to an active or completed examination ("${attachedExam.title}").`,
      });
    }

    paper.isArchived = true;
    await paper.save();

    res.status(200).json({
      success: true,
      message: 'Question paper safely deleted (archived)',
    });
  } catch (error) {
    next(error);
  }
};
