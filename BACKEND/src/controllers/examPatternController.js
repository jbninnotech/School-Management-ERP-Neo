import ExamPattern from '../models/examPatternModel.js';
import User from '../models/userModel.js';
import Notification from '../models/notificationModel.js';

export const getExamPatterns = async (req, res, next) => {
  try {
    const { classGrade, subject, status } = req.query;
    const query = { isDeleted: false };

    if (classGrade) query.classGrade = classGrade;
    if (subject) query.subject = subject;
    if (status) query.status = status;

    // Teachers see only patterns assigned to them
    if (req.user.role === 'teacher') {
      query.$or = [
        { assignedTeachers: req.user._id },
        { createdBy: req.user._id },
      ];
    }

    const patterns = await ExamPattern.find(query)
      .populate('assignedTeachers', 'name email schoolId teacherProfile')
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: patterns,
    });
  } catch (err) {
    next(err);
  }
};

export const getExamPatternById = async (req, res, next) => {
  try {
    const pattern = await ExamPattern.findOne({ _id: req.params.id, isDeleted: false })
      .populate('assignedTeachers', 'name email schoolId teacherProfile')
      .populate('createdBy', 'name email role');

    if (!pattern) {
      return res.status(404).json({ success: false, message: 'Exam pattern not found' });
    }

    if (
      req.user.role === 'teacher' &&
      !pattern.assignedTeachers.some((t) => t._id.toString() === req.user._id.toString()) &&
      pattern.createdBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this exam pattern' });
    }

    res.status(200).json({ success: true, data: pattern });
  } catch (err) {
    next(err);
  }
};

export const createExamPattern = async (req, res, next) => {
  try {
    const {
      name,
      classGrade,
      subject,
      totalMarks,
      durationMinutes,
      sections,
      negativeMarking,
      difficultyDistribution,
      passingMarks,
      maxWarnings,
      instructions,
      assignedTeachers = [],
    } = req.body;

    if (!name || !classGrade || !subject || !totalMarks || !durationMinutes || !passingMarks) {
      return res.status(400).json({
        success: false,
        message: 'Missing required exam pattern fields (name, classGrade, subject, totalMarks, durationMinutes, passingMarks)',
      });
    }

    const pattern = await ExamPattern.create({
      name,
      classGrade,
      subject,
      totalMarks: Number(totalMarks),
      durationMinutes: Number(durationMinutes),
      sections: sections || [],
      negativeMarking: Boolean(negativeMarking),
      difficultyDistribution: difficultyDistribution || { easy: 30, medium: 50, hard: 20 },
      passingMarks: Number(passingMarks),
      maxWarnings: Number(maxWarnings) || 3,
      instructions: instructions || '',
      assignedTeachers,
      createdBy: req.user._id,
    });

    // Notify assigned teachers
    if (assignedTeachers.length > 0) {
      const notifications = assignedTeachers.map((teacherId) => ({
        recipient: teacherId,
        title: 'New Exam Pattern Assigned',
        message: `Admin has assigned you the examination pattern "${pattern.name}" for ${pattern.classGrade} (${pattern.subject}).`,
        type: 'exam_assigned',
        metadata: { patternId: pattern._id },
      }));
      await Notification.insertMany(notifications);
    }

    res.status(201).json({
      success: true,
      message: 'Exam pattern created successfully',
      data: pattern,
    });
  } catch (err) {
    next(err);
  }
};

export const updateExamPattern = async (req, res, next) => {
  try {
    const pattern = await ExamPattern.findOne({ _id: req.params.id, isDeleted: false });
    if (!pattern) {
      return res.status(404).json({ success: false, message: 'Exam pattern not found' });
    }

    const oldAssigned = (pattern.assignedTeachers || []).map((id) => id.toString());
    Object.assign(pattern, req.body);
    await pattern.save();

    // Check newly assigned teachers and notify them
    const newAssigned = (pattern.assignedTeachers || []).map((id) => id.toString());
    const newlyAddedTeachers = newAssigned.filter((tId) => !oldAssigned.includes(tId));

    if (newlyAddedTeachers.length > 0) {
      const notifications = newlyAddedTeachers.map((teacherId) => ({
        recipient: teacherId,
        title: 'New Exam Pattern Assigned',
        message: `You have been assigned the exam pattern "${pattern.name}" for ${pattern.classGrade} (${pattern.subject}).`,
        type: 'exam_assigned',
        metadata: { patternId: pattern._id },
      }));
      await Notification.insertMany(notifications);
    }

    res.status(200).json({
      success: true,
      message: 'Exam pattern updated successfully',
      data: pattern,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteExamPattern = async (req, res, next) => {
  try {
    const pattern = await ExamPattern.findOne({ _id: req.params.id, isDeleted: false });
    if (!pattern) {
      return res.status(404).json({ success: false, message: 'Exam pattern not found' });
    }

    pattern.isDeleted = true;
    await pattern.save();

    res.status(200).json({
      success: true,
      message: 'Exam pattern deleted successfully (soft deleted)',
    });
  } catch (err) {
    next(err);
  }
};

export const assignTeachersToPattern = async (req, res, next) => {
  try {
    const { teacherIds = [] } = req.body;
    const pattern = await ExamPattern.findOne({ _id: req.params.id, isDeleted: false });
    if (!pattern) {
      return res.status(404).json({ success: false, message: 'Exam pattern not found' });
    }

    const currentTeacherIds = (pattern.assignedTeachers || []).map((id) => id.toString());
    const newlyAdded = teacherIds.filter((tId) => !currentTeacherIds.includes(tId));

    pattern.assignedTeachers = teacherIds;
    await pattern.save();

    if (newlyAdded.length > 0) {
      const notifications = newlyAdded.map((teacherId) => ({
        recipient: teacherId,
        title: 'New Exam Pattern Assigned',
        message: `Admin has assigned you the exam pattern "${pattern.name}".`,
        type: 'exam_assigned',
        metadata: { patternId: pattern._id },
      }));
      await Notification.insertMany(notifications);
    }

    res.status(200).json({
      success: true,
      message: 'Teachers assigned successfully',
      data: pattern,
    });
  } catch (err) {
    next(err);
  }
};
