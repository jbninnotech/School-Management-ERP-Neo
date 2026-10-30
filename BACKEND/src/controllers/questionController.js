import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const mammoth = require('mammoth');
const xlsx = require('xlsx');

// Safe, universal PDF extractor (works with both v1 functions and v2 classes)
const extractPdfText = async (fileBuffer) => {
  let pdfLib;
  try {
    pdfLib = require('pdf-parse');
  } catch (e) {
    pdfLib = require('pdf-parse/lib/pdf-parse.js');
  }

  // 1. Try calling directly as a function (pdf-parse v1.1.1)
  try {
    if (typeof pdfLib === 'function' && !pdfLib.toString().startsWith('class')) {
      const result = await pdfLib(fileBuffer);
      return result?.text || '';
    }
  } catch (err) {
    if (!err.message?.includes('Class constructor')) {
      throw err;
    }
  }

  // 2. Fallback: If installed as a class (pdf-parse v2)
  try {
    const PDFClass = typeof pdfLib === 'function' ? pdfLib : (pdfLib.PDFParse || pdfLib.default);
    if (PDFClass) {
      let instance;
      try {
        instance = new PDFClass(fileBuffer);
      } catch (_) {
        instance = new PDFClass();
      }

      if (typeof instance.getText === 'function') {
        const text = await instance.getText();
        return text || '';
      }
      if (typeof instance.parse === 'function') {
        const res = await instance.parse(fileBuffer);
        return res?.text || (typeof res === 'string' ? res : '');
      }
      if (typeof instance.then === 'function') {
        const res = await instance;
        return res?.text || '';
      }
    }
  } catch (classErr) {
    console.error('PDF class parser error:', classErr);
  }

  // 3. Fallback: direct internal lib
  try {
    const directLib = require('pdf-parse/lib/pdf-parse.js');
    if (typeof directLib === 'function') {
      const res = await directLib(fileBuffer);
      return res?.text || '';
    }
  } catch (_) {}

  throw new Error('Unable to extract text from PDF. Please run: npm install pdf-parse@1.1.1');
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
// 6. DIRECT FILE BULK IMPORT (PDF, DOCX, XLSX, CSV)
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
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

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