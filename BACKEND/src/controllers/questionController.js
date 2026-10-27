import Question from '../models/questionModel.js';

// @desc    Create Question in Question Bank
// @route   POST /api/questions
export const createQuestion = async (req, res, next) => {
  try {
    const {
      classGrade,
      subject,
      chapter,
      topic,
      questionType,
      difficulty,
      marks,
      negativeMarks,
      questionText,
      instructionText,
      passageText,
      imageUrl,
      options,
      matchPairs,
      correctAnswer,
      numericalTolerance,
      explanation,
      tags,
      estimatedTimeMinutes,
    } = req.body;

    if (!classGrade || !subject || !questionType || !questionText) {
      return res.status(400).json({
        success: false,
        message: 'Please provide class, subject, question type, and question text',
      });
    }

    if (correctAnswer === undefined || correctAnswer === null || correctAnswer === '') {
      return res.status(400).json({
        success: false,
        message: 'Correct answer / answer key is required for question creation',
      });
    }

    const question = await Question.create({
      schoolId: req.user.schoolId || 'SCH-DEFAULT',
      academicYear: '2025-2026',
      classGrade,
      subject,
      chapter: chapter || '',
      topic: topic || '',
      questionType,
      difficulty: difficulty || 'medium',
      marks: Number(marks) || 1,
      negativeMarks: Number(negativeMarks) || 0,
      questionText,
      instructionText: instructionText || '',
      passageText: passageText || '',
      imageUrl: imageUrl || '',
      options: options || [],
      matchPairs: matchPairs || [],
      correctAnswer,
      numericalTolerance: Number(numericalTolerance) || 0,
      explanation: explanation || '',
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : [],
      estimatedTimeMinutes: Number(estimatedTimeMinutes) || 2,
      createdBy: req.user._id,
      status: 'approved',
    });

    res.status(201).json({
      success: true,
      message: 'Question added to Question Bank successfully',
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Questions with search, filters & pagination
// @route   GET /api/questions
export const getQuestions = async (req, res, next) => {
  try {
    const {
      classGrade,
      subject,
      chapter,
      difficulty,
      questionType,
      search,
      page = 1,
      limit = 50,
      status,
    } = req.query;

    const query = { isArchived: { $ne: true } };

    if (classGrade) query.classGrade = classGrade;
    if (subject) query.subject = subject;
    if (chapter) query.chapter = new RegExp(chapter, 'i');
    if (difficulty) query.difficulty = difficulty;
    if (questionType) query.questionType = questionType;
    if (status) query.status = status;

    if (search) {
      query.$or = [
        { questionText: { $regex: search, $options: 'i' } },
        { chapter: { $regex: search, $options: 'i' } },
        { topic: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Question.countDocuments(query);
    const questions = await Question.find(query)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: questions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Single Question by ID
// @route   GET /api/questions/:id
export const getQuestionById = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id).populate('createdBy', 'name email role');
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    res.status(200).json({ success: true, data: question });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Question
// @route   PUT /api/questions/:id
export const updateQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    // Role-check: Only creator, Principal/Admin, or SuperAdmin can edit
    if (
      req.user.role === 'teacher' &&
      question.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are only authorized to edit your own questions',
      });
    }

    Object.assign(question, req.body);
    await question.save();

    res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete / Archive Question
// @route   DELETE /api/questions/:id
export const deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    question.isArchived = true;
    await question.save();

    res.status(200).json({
      success: true,
      message: 'Question archived from Question Bank',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Import Questions (CSV / JSON payload)
// @route   POST /api/questions/import
export const importQuestions = async (req, res, next) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of questions to import',
      });
    }

    const formatted = questions.map((q) => ({
      schoolId: req.user.schoolId || 'SCH-DEFAULT',
      academicYear: q.academicYear || '2025-2026',
      classGrade: q.classGrade,
      subject: q.subject,
      chapter: q.chapter || '',
      topic: q.topic || '',
      questionType: q.questionType || 'single_mcq',
      difficulty: q.difficulty || 'medium',
      marks: Number(q.marks) || 1,
      negativeMarks: Number(q.negativeMarks) || 0,
      questionText: q.questionText,
      instructionText: q.instructionText || '',
      passageText: q.passageText || '',
      imageUrl: q.imageUrl || '',
      options: Array.isArray(q.options) ? q.options : [],
      matchPairs: Array.isArray(q.matchPairs) ? q.matchPairs : [],
      correctAnswer: q.correctAnswer,
      numericalTolerance: Number(q.numericalTolerance) || 0,
      explanation: q.explanation || '',
      tags: Array.isArray(q.tags) ? q.tags : typeof q.tags === 'string' ? q.tags.split(',') : [],
      createdBy: req.user._id,
      status: 'approved',
    }));

    const inserted = await Question.insertMany(formatted);

    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} questions into Question Bank`,
      count: inserted.length,
      data: inserted,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Auto-Select Blueprint Questions
// @route   POST /api/questions/blueprint-generate
export const generateBlueprintQuestions = async (req, res, next) => {
  try {
    const {
      classGrade,
      subject,
      totalQuestions = 10,
      easyPercentage = 20,
      mediumPercentage = 50,
      hardPercentage = 30,
      preferredTypes = [],
    } = req.body;

    const easyCount = Math.round((totalQuestions * easyPercentage) / 100);
    const mediumCount = Math.round((totalQuestions * mediumPercentage) / 100);
    const hardCount = totalQuestions - easyCount - mediumCount;

    const baseFilter = {
      classGrade,
      subject,
      isArchived: { $ne: true },
      status: 'approved',
    };

    if (preferredTypes.length > 0) {
      baseFilter.questionType = { $in: preferredTypes };
    }

    // Fetch questions by difficulty
    const [easyQs, medQs, hardQs] = await Promise.all([
      Question.find({ ...baseFilter, difficulty: 'easy' }).limit(easyCount + 10),
      Question.find({ ...baseFilter, difficulty: 'medium' }).limit(mediumCount + 10),
      Question.find({ ...baseFilter, difficulty: 'hard' }).limit(hardCount + 10),
    ]);

    const selected = [
      ...easyQs.slice(0, easyCount),
      ...medQs.slice(0, mediumCount),
      ...hardQs.slice(0, hardCount),
    ];

    if (selected.length < totalQuestions) {
      // Backfill from any difficulty if specific counts are not fully matched
      const existingIds = selected.map((q) => q._id);
      const remainingNeeded = totalQuestions - selected.length;
      const extraQs = await Question.find({
        ...baseFilter,
        _id: { $nin: existingIds },
      }).limit(remainingNeeded);
      selected.push(...extraQs);
    }

    res.status(200).json({
      success: true,
      requestedCount: totalQuestions,
      generatedCount: selected.length,
      isSufficient: selected.length >= totalQuestions,
      data: selected,
    });
  } catch (error) {
    next(error);
  }
};
