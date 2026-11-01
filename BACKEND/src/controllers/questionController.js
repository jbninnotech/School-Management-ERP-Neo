import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const mammoth = require('mammoth');
const xlsx = require('xlsx');
const Papa = require('papaparse');

// Universal PDF extractor using internal pdf-parse module (avoids test-data debug load in root index.js)
const extractPdfText = async (fileBuffer) => {
  try {
    const pdfLib = require('pdf-parse/lib/pdf-parse.js');
    if (typeof pdfLib === 'function') {
      const result = await pdfLib(fileBuffer);
      return result?.text || '';
    }
  } catch (err) {
    console.error('Error in pdf-parse extraction:', err.message);
  }

  try {
    const pdfLib = require('pdf-parse');
    if (typeof pdfLib === 'function') {
      const result = await pdfLib(fileBuffer);
      return result?.text || '';
    }
  } catch (err) {
    console.error('Fallback pdf-parse failed:', err.message);
  }

  throw new Error('Unable to extract text from PDF file. Please ensure it contains selectable text.');
};

import Question from '../models/questionModel.js';

// ==========================================
// Helper: Universal Text Parser for PDF & Word
// ==========================================
const parseTextToQuestions = (rawText, defaultClass, defaultSubject) => {
  const questions = [];
  // Split on "1.", "Q1.", "Question 1:", "1)"
  const rawBlocks = rawText.split(/(?=(?:(?:Q|Question)\s*\d+[\.:\)]|\b\d+[\.:\)]))\s*/i);

  for (const block of rawBlocks) {
    if (!block.trim() || block.length < 10) continue;

    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) continue;

    const stemLine = lines[0].replace(/^(?:(?:Q|Question)\s*\d+[\.:\)]|\b\d+[\.:\)])\s*/i, '').trim();
    if (!stemLine) continue;

    const options = [];
    let correctAnswer = 'opt_1';
    let explanation = '';
    let questionText = stemLine;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Match options: A) ... or (A) ... or A. ...
      const optMatch = line.match(/^[\(\[]?([A-Da-d])[\)\]\.:\-]\s*(.+)$/);
      // Match answer keys: Ans: B or Answer: B or Key: A
      const ansMatch = line.match(/^(?:Answer|Ans|Correct|Key)[\s:\-]+([A-Da-d0-9\w]+)/i);
      // Match explanations: Solution: ... or Explanation: ...
      const expMatch = line.match(/^(?:Explanation|Sol|Solution)[\s:\-]+(.+)$/i);

      if (optMatch) {
        const letter = optMatch[1].toUpperCase();
        const optNum = letter.charCodeAt(0) - 64; // A->1, B->2, C->3, D->4
        options.push({
          id: `opt_${optNum}`,
          text: optMatch[2].trim(),
        });
      } else if (ansMatch) {
        const keyLetter = ansMatch[1].toUpperCase();
        const optNum = keyLetter.charCodeAt(0) - 64;
        if (optNum >= 1 && optNum <= 4) {
          correctAnswer = `opt_${optNum}`;
        } else {
          correctAnswer = ansMatch[1].trim();
        }
      } else if (expMatch) {
        explanation = expMatch[1].trim();
      } else if (options.length === 0) {
        questionText += ' ' + line;
      }
    }

    if (questionText.trim()) {
      questions.push({
        classGrade: defaultClass || 'Class 10',
        subject: defaultSubject || 'General',
        questionType: options.length > 0 ? 'single_mcq' : 'short_answer',
        difficulty: 'medium',
        marks: options.length > 0 ? 1 : 2,
        negativeMarks: 0,
        questionText: questionText.trim(),
        options: options.length > 0 ? options : [],
        correctAnswer: options.length > 0 ? correctAnswer : 'N/A',
        explanation: explanation || '',
      });
    }
  }

  return questions;
};

// ==========================================
// 1. GET ALL QUESTIONS WITH FILTERS
// ==========================================
export const getQuestions = async (req, res, next) => {
  try {
    const { classGrade, subject, difficulty, questionType, search } = req.query;
    const filter = { isArchived: { $ne: true } };

    if (classGrade) filter.classGrade = classGrade;
    if (subject) filter.subject = subject;
    if (difficulty) filter.difficulty = difficulty;
    if (questionType) filter.questionType = questionType;

    if (search) {
      filter.$or = [
        { questionText: { $regex: search, $options: 'i' } },
        { chapter: { $regex: search, $options: 'i' } },
        { topic: { $regex: search, $options: 'i' } },
      ];
    }

    const questions = await Question.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: questions.length,
      data: questions,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. CREATE A SINGLE QUESTION
// ==========================================
export const createQuestion = async (req, res, next) => {
  try {
    const question = await Question.create({
      ...req.body,
      schoolId: req.user.schoolId || 'SCH-DEFAULT',
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Question added to Question Bank',
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. GET SINGLE QUESTION
// ==========================================
export const getQuestionById = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    res.status(200).json({ success: true, data: question });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. UPDATE QUESTION
// ==========================================
export const updateQuestion = async (req, res, next) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    res.status(200).json({ success: true, message: 'Question updated successfully', data: question });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. ARCHIVE / DELETE QUESTION
// ==========================================
export const deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { isArchived: true, status: 'archived' },
      { new: true }
    );
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    res.status(200).json({ success: true, message: 'Question archived from bank' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. PREVIEW QUESTIONS FROM FILE (NO SAVE)
// ==========================================
export const previewQuestionsFromFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file (.pdf, .docx, .xlsx, .csv)' });
    }

    const { classGrade, subject } = req.body;
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname.toLowerCase();
    let parsedQuestions = [];

    // CASE A: Excel (.xlsx / .xls) and CSV
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
      let sheetData = [];
      if (fileName.endsWith('.csv')) {
        const csvString = fileBuffer.toString('utf8');
        const parsedCsv = Papa.parse(csvString, { header: true, skipEmptyLines: true });
        sheetData = parsedCsv.data;
      } else {
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      }

      const optMap = { A: 'opt_1', B: 'opt_2', C: 'opt_3', D: 'opt_4', '1': 'opt_1', '2': 'opt_2', '3': 'opt_3', '4': 'opt_4' };

      parsedQuestions = sheetData.map((row, index) => {
        // Find case-insensitive keys
        const getVal = (possibleKeys) => {
          for (const key of possibleKeys) {
            const foundKey = Object.keys(row).find((k) => k.trim().toLowerCase() === key.toLowerCase());
            if (foundKey && row[foundKey] !== undefined) return String(row[foundKey]).trim();
          }
          return '';
        };

        const optA = getVal(['OptionA', 'Option A', 'A', 'OptA']);
        const optB = getVal(['OptionB', 'Option B', 'B', 'OptB']);
        const optC = getVal(['OptionC', 'Option C', 'C', 'OptC']);
        const optD = getVal(['OptionD', 'Option D', 'D', 'OptD']);

        const options = [];
        if (optA) options.push({ id: 'opt_1', text: optA });
        if (optB) options.push({ id: 'opt_2', text: optB });
        if (optC) options.push({ id: 'opt_3', text: optC });
        if (optD) options.push({ id: 'opt_4', text: optD });

        const rawAns = (getVal(['CorrectAnswer', 'Correct Answer', 'Answer', 'Ans', 'Key']) || 'A').toUpperCase();
        const questionText = getVal(['QuestionText', 'Question', 'questionText', 'Question Text', 'Stem']);
        const marks = Number(getVal(['Marks', 'marks'])) || (options.length > 0 ? 1 : 2);
        const difficulty = (getVal(['Difficulty', 'difficulty']) || 'medium').toLowerCase();
        const qType = options.length > 0 ? (getVal(['QuestionType', 'Type']) || 'single_mcq') : 'short_answer';

        const errors = [];
        if (!questionText) errors.push('Missing question text');
        if (options.length > 0 && options.length < 2) errors.push('MCQs must have at least 2 options');

        return {
          tempId: `tmp_${index + 1}`,
          classGrade: getVal(['Class', 'classGrade']) || classGrade || 'Class 10',
          subject: getVal(['Subject', 'subject']) || subject || 'General',
          chapter: getVal(['Chapter', 'chapter']) || '',
          topic: getVal(['Topic', 'topic']) || '',
          questionType: qType,
          difficulty: ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium',
          marks,
          negativeMarks: Number(getVal(['NegativeMarks', 'negativeMarks'])) || 0,
          questionText,
          options,
          correctAnswer: options.length > 0 ? (optMap[rawAns] || 'opt_1') : (rawAns || 'N/A'),
          explanation: getVal(['Explanation', 'explanation']) || '',
          hasError: errors.length > 0,
          errorReason: errors.join(', '),
        };
      });
    }

    // CASE B: Word Document (.docx)
    else if (fileName.endsWith('.docx')) {
      const docxData = await mammoth.extractRawText({ buffer: fileBuffer });
      const rawText = docxData.value || '';
      parsedQuestions = parseTextToQuestions(rawText, classGrade, subject).map((q, idx) => ({
        ...q,
        tempId: `tmp_${idx + 1}`,
        hasError: !q.questionText,
        errorReason: !q.questionText ? 'Missing question text' : '',
      }));
    }

    // CASE C: PDF Document (.pdf)
    else if (fileName.endsWith('.pdf')) {
      const rawText = await extractPdfText(fileBuffer);
      parsedQuestions = parseTextToQuestions(rawText, classGrade, subject).map((q, idx) => ({
        ...q,
        tempId: `tmp_${idx + 1}`,
        hasError: !q.questionText,
        errorReason: !q.questionText ? 'Missing question text' : '',
      }));
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unsupported format. Please upload .pdf, .docx, .xlsx, or .csv',
      });
    }

    const validQuestions = parsedQuestions.filter((q) => !q.hasError && q.questionText.trim().length > 0);
    const errorQuestions = parsedQuestions.filter((q) => q.hasError || !q.questionText.trim());

    res.status(200).json({
      success: true,
      fileName: req.file.originalname,
      totalDetected: parsedQuestions.length,
      validCount: validQuestions.length,
      errorCount: errorQuestions.length,
      preview: parsedQuestions,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 7. CONFIRM AND SAVE BULK QUESTIONS
// ==========================================
export const confirmImportQuestions = async (req, res, next) => {
  try {
    const { questions, examId, sectionId } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'No questions provided for import' });
    }

    const sanitizedQuestions = questions.map((q) => ({
      schoolId: req.user.schoolId || 'SCH-DEFAULT',
      academicYear: '2025-2026',
      classGrade: q.classGrade || 'Class 10',
      subject: q.subject || 'General',
      chapter: q.chapter || '',
      topic: q.topic || '',
      questionType: q.questionType || (q.options?.length > 0 ? 'single_mcq' : 'short_answer'),
      difficulty: q.difficulty || 'medium',
      marks: Number(q.marks) || 1,
      negativeMarks: Number(q.negativeMarks) || 0,
      questionText: q.questionText,
      options: q.options || [],
      correctAnswer: q.correctAnswer || 'opt_1',
      explanation: q.explanation || '',
      createdBy: req.user._id,
      status: 'approved',
    }));

    const inserted = await Question.insertMany(sanitizedQuestions);

    // If an examId and sectionId are supplied, optionally link them directly to the examination paper
    if (examId) {
      const Examination = (await import('../models/examinationModel.js')).default;
      const exam = await Examination.findById(examId);
      if (exam && exam.examSections && exam.examSections.length > 0) {
        const secIndex = sectionId
          ? exam.examSections.findIndex((s) => s.id === sectionId || s._id?.toString() === sectionId)
          : 0;
        const targetSec = secIndex >= 0 ? exam.examSections[secIndex] : exam.examSections[0];

        inserted.forEach((iq) => {
          targetSec.questions.push({
            questionId: iq._id,
            questionText: iq.questionText,
            questionType: iq.questionType,
            difficulty: iq.difficulty,
            marks: iq.marks,
            negativeMarks: iq.negativeMarks,
            options: iq.options,
            correctAnswer: iq.correctAnswer,
            explanation: iq.explanation,
          });
        });

        // Recalculate total marks
        let sumMarks = 0;
        exam.examSections.forEach((s) => {
          s.questions?.forEach((q) => {
            sumMarks += q.marks || 1;
          });
        });
        exam.totalMarks = sumMarks;
        await exam.save();
      }
    }

    res.status(201).json({
      success: true,
      message: `Successfully imported and saved ${inserted.length} question(s)!`,
      count: inserted.length,
      data: inserted,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 8. DOWNLOAD QUESTION TEMPLATES
// ==========================================
export const getQuestionTemplate = async (req, res, next) => {
  try {
    const format = (req.query.format || 'csv').toLowerCase();

    const sampleData = [
      {
        QuestionText: 'What is the SI unit of electric current?',
        QuestionType: 'single_mcq',
        OptionA: 'Volt',
        OptionB: 'Ampere',
        OptionC: 'Ohm',
        OptionD: 'Watt',
        CorrectAnswer: 'B',
        Marks: 2,
        NegativeMarks: 0.5,
        Difficulty: 'easy',
        Class: 'Class 10',
        Subject: 'Physics',
        Explanation: 'Electric current is measured in Amperes (A).',
      },
      {
        QuestionText: 'The chemical formula of water is H2O.',
        QuestionType: 'true_false',
        OptionA: 'True',
        OptionB: 'False',
        OptionC: '',
        OptionD: '',
        CorrectAnswer: 'A',
        Marks: 1,
        NegativeMarks: 0,
        Difficulty: 'easy',
        Class: 'Class 10',
        Subject: 'Chemistry',
        Explanation: 'Water molecule consists of 2 Hydrogen atoms and 1 Oxygen atom.',
      },
    ];

    if (format === 'xlsx' || format === 'xls') {
      const ws = xlsx.utils.json_to_sheet(sampleData);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'QuestionsTemplate');
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Question_Import_Template.xlsx"');
      return res.send(buffer);
    }

    // Default: CSV
    const csvContent = Papa.unparse(sampleData);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="Question_Import_Template.csv"');
    return res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 9. DIRECT FILE BULK IMPORT (LEGACY COMPAT)
// ==========================================
export const importQuestionsFromFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file (.pdf, .docx, .xlsx, .csv)' });
    }

    const { classGrade, subject } = req.body;
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname.toLowerCase();
    let questionsToInsert = [];

    // CASE A: Excel (.xlsx / .xls) and CSV
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
      let sheetData = [];
      if (fileName.endsWith('.csv')) {
        const csvString = fileBuffer.toString('utf8');
        sheetData = Papa.parse(csvString, { header: true, skipEmptyLines: true }).data;
      } else {
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      }

      const optMap = { A: 'opt_1', B: 'opt_2', C: 'opt_3', D: 'opt_4', '1': 'opt_1', '2': 'opt_2', '3': 'opt_3', '4': 'opt_4' };

      questionsToInsert = sheetData
        .map((row) => {
          const options = [];
          if (row.OptionA || row['Option A']) options.push({ id: 'opt_1', text: String(row.OptionA || row['Option A']) });
          if (row.OptionB || row['Option B']) options.push({ id: 'opt_2', text: String(row.OptionB || row['Option B']) });
          if (row.OptionC || row['Option C']) options.push({ id: 'opt_3', text: String(row.OptionC || row['Option C']) });
          if (row.OptionD || row['Option D']) options.push({ id: 'opt_4', text: String(row.OptionD || row['Option D']) });

          const rawAns = String(row.CorrectAnswer || row['Correct Answer'] || row.Answer || 'A').toUpperCase().trim();

          return {
            schoolId: req.user.schoolId || 'SCH-DEFAULT',
            academicYear: '2025-2026',
            classGrade: row.Class || row.classGrade || classGrade || 'Class 10',
            subject: row.Subject || row.subject || subject || 'General',
            chapter: row.Chapter || row.chapter || '',
            topic: row.Topic || row.topic || '',
            questionType: options.length > 0 ? (row.QuestionType || 'single_mcq') : (row.QuestionType || 'short_answer'),
            difficulty: (row.Difficulty || 'medium').toLowerCase(),
            marks: Number(row.Marks || row.marks) || 1,
            negativeMarks: Number(row.NegativeMarks || row.negativeMarks) || 0,
            questionText: String(row.QuestionText || row.Question || row.questionText || ''),
            options: options.length > 0 ? options : [],
            correctAnswer: options.length > 0 ? (optMap[rawAns] || 'opt_1') : (rawAns || 'N/A'),
            explanation: String(row.Explanation || row.explanation || ''),
            createdBy: req.user._id,
            status: 'approved',
          };
        })
        .filter((q) => q.questionText.trim().length > 0);
    }

    // CASE B: Word Document (.docx)
    else if (fileName.endsWith('.docx')) {
      const docxData = await mammoth.extractRawText({ buffer: fileBuffer });
      const rawText = docxData.value || '';
      const parsed = parseTextToQuestions(rawText, classGrade, subject);
      questionsToInsert = parsed.map((q) => ({
        ...q,
        schoolId: req.user.schoolId || 'SCH-DEFAULT',
        academicYear: '2025-2026',
        createdBy: req.user._id,
        status: 'approved',
      }));
    }

    // CASE C: PDF Document (.pdf)
    else if (fileName.endsWith('.pdf')) {
      const rawText = await extractPdfText(fileBuffer);
      const parsed = parseTextToQuestions(rawText, classGrade, subject);
      questionsToInsert = parsed.map((q) => ({
        ...q,
        schoolId: req.user.schoolId || 'SCH-DEFAULT',
        academicYear: '2025-2026',
        createdBy: req.user._id,
        status: 'approved',
      }));
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unsupported format. Please upload .pdf, .docx, .xlsx, or .csv',
      });
    }

    if (questionsToInsert.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid questions could be extracted. Please ensure questions are numbered (e.g. 1. Question stem, A) Option, Ans: A).',
      });
    }

    const inserted = await Question.insertMany(questionsToInsert);

    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} question(s) into the Bank!`,
      count: inserted.length,
      data: inserted,
    });
  } catch (error) {
    next(error);
  }
};