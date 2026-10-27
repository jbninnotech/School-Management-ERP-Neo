import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from './models/userModel.js';
import Question from './models/questionModel.js';
import Examination from './models/examinationModel.js';
import ExaminationAttempt from './models/examinationAttemptModel.js';
import AcademicStructure from './models/academicModel.js';

const seedData = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB.');

    console.log('🧹 Clearing existing seed data...');
    await Promise.all([
      User.deleteMany({}),
      Question.deleteMany({}),
      Examination.deleteMany({}),
      ExaminationAttempt.deleteMany({}),
      AcademicStructure.deleteMany({}),
    ]);

    // 1. Super Admin
    const superAdmin = await User.create({
      name: 'Global Director (Super Admin)',
      email: 'superadmin@neo.com',
      password: 'SuperAdmin@2026',
      phone: '+91 9876543210',
      role: 'superadmin',
      isActive: true,
    });
    console.log('👑 Super Admin created: superadmin@neo.com');

    // 2. Principal (Admin)
    const principal = await User.create({
      name: 'Dr. Robert Jenkins (Principal)',
      email: 'principal@neo.com',
      password: 'Principal@2026',
      phone: '+91 9876543211',
      role: 'admin',
      createdBy: superAdmin._id,
      isActive: true,
    });
    console.log('🏫 Principal created: principal@neo.com');

    // 3. Teachers
    const teachers = await User.create([
      {
        name: 'Sarah Connor',
        email: 'sarah.math@neo.com',
        password: 'Teacher@2026',
        phone: '+91 9988771122',
        role: 'teacher',
        createdBy: principal._id,
        isActive: true,
        teacherProfile: {
          employeeId: 'EMP-T-01',
          subject: 'Mathematics',
          qualification: 'M.Sc., B.Ed.',
          assignedClasses: ['Class 10', 'Class 9', 'Class 8'],
          assignedSections: ['A', 'B'],
          assignedSubjects: ['Mathematics Standard', 'Mathematics Basic', 'Science (Phy/Chem/Bio)'],
        },
      },
      {
        name: 'Alan Turing',
        email: 'alan.cs@neo.com',
        password: 'Teacher@2026',
        phone: '+91 9988771133',
        role: 'teacher',
        createdBy: principal._id,
        isActive: true,
        teacherProfile: {
          employeeId: 'EMP-T-02',
          subject: 'Computer Science',
          qualification: 'M.Tech., Ph.D.',
          assignedClasses: ['Class 10', 'Class 11', 'Class 12'],
          assignedSections: ['A', 'B', 'Science'],
          assignedSubjects: ['Information Technology', 'Computer Science'],
        },
      },
    ]);
    console.log('👨‍🏫 Teachers created: Math & CS faculty');

    // 4. Students
    const students = await User.create([
      {
        name: 'Aryan Sharma',
        email: 'aryan.student@neo.com',
        password: 'Student@2026',
        phone: '+91 9812345678',
        role: 'student',
        createdBy: principal._id,
        isActive: true,
        studentProfile: {
          rollNumber: '1001',
          classGrade: 'Class 10',
          section: 'A',
          parentName: 'Ramesh Sharma',
          parentPhone: '+91 9812345670',
        },
      },
      {
        name: 'Priya Patel',
        email: 'priya.student@neo.com',
        password: 'Student@2026',
        phone: '+91 9812345679',
        role: 'student',
        createdBy: principal._id,
        isActive: true,
        studentProfile: {
          rollNumber: '1002',
          classGrade: 'Class 10',
          section: 'A',
          parentName: 'Suresh Patel',
          parentPhone: '+91 9812345671',
        },
      },
      {
        name: 'Leo Miller',
        email: 'leo.ukg@neo.com',
        password: 'Student@2026',
        phone: '+91 9812345680',
        role: 'student',
        createdBy: principal._id,
        isActive: true,
        studentProfile: {
          rollNumber: 'UKG-01',
          classGrade: 'UKG',
          section: 'A',
          parentName: 'David Miller',
          parentPhone: '+91 9812345672',
        },
      },
    ]);
    console.log('🎒 Students created: Aryan (Class 10-A), Priya (Class 10-A), Leo (UKG)');

    // 5. Seed Questions into Reusable Question Bank
    const sampleQuestions = [
      {
        classGrade: 'Class 10',
        subject: 'Mathematics Standard',
        chapter: 'Quadratic Equations',
        topic: 'Discriminant and Nature of Roots',
        questionType: 'single_mcq',
        difficulty: 'easy',
        marks: 2,
        negativeMarks: 0.5,
        questionText: 'For what value of k does the quadratic equation 2x² - kx + 2 = 0 have equal roots?',
        options: [
          { id: 'opt_1', text: '± 2' },
          { id: 'opt_2', text: '± 4' },
          { id: 'opt_3', text: '± 1' },
          { id: 'opt_4', text: '± 8' },
        ],
        correctAnswer: 'opt_2',
        explanation: 'For equal roots, D = b² - 4ac = 0 => (-k)² - 4(2)(2) = 0 => k² = 16 => k = ±4.',
        createdBy: teachers[0]._id,
      },
      {
        classGrade: 'Class 10',
        subject: 'Mathematics Standard',
        chapter: 'Arithmetic Progressions',
        topic: 'nth Term',
        questionType: 'single_mcq',
        difficulty: 'medium',
        marks: 2,
        negativeMarks: 0.5,
        questionText: 'If the 17th term of an AP exceeds its 10th term by 7, what is the common difference (d)?',
        options: [
          { id: 'opt_1', text: '1' },
          { id: 'opt_2', text: '2' },
          { id: 'opt_3', text: '7' },
          { id: 'opt_4', text: '-1' },
        ],
        correctAnswer: 'opt_1',
        explanation: 'a17 - a10 = (a + 16d) - (a + 9d) = 7d = 7 => d = 1.',
        createdBy: teachers[0]._id,
      },
      {
        classGrade: 'Class 10',
        subject: 'Mathematics Standard',
        chapter: 'Real Numbers',
        topic: 'Prime Factorisation',
        questionType: 'multiple_select',
        difficulty: 'medium',
        marks: 3,
        negativeMarks: 0.5,
        questionText: 'Select ALL numbers from the options below that are irrational numbers:',
        options: [
          { id: 'opt_1', text: '√2 + √3' },
          { id: 'opt_2', text: 'π (Pi)' },
          { id: 'opt_3', text: '3.14159' },
          { id: 'opt_4', text: '0.1010010001...' },
        ],
        correctAnswer: ['opt_1', 'opt_2', 'opt_4'],
        explanation: '3.14159 is a terminating rational number. √2+√3, π, and non-terminating non-repeating decimals are irrational.',
        createdBy: teachers[0]._id,
      },
      {
        classGrade: 'Class 10',
        subject: 'Mathematics Standard',
        chapter: 'Coordinate Geometry',
        topic: 'Distance Formula',
        questionType: 'true_false',
        difficulty: 'easy',
        marks: 1,
        negativeMarks: 0,
        questionText: 'The distance of the point P(3, 4) from the origin (0, 0) is exactly 5 units.',
        correctAnswer: true,
        explanation: 'Distance = √(3² + 4²) = √(9 + 16) = √25 = 5 units.',
        createdBy: teachers[0]._id,
      },
      {
        classGrade: 'Class 10',
        subject: 'Mathematics Standard',
        chapter: 'Trigonometry',
        topic: 'Standard Angles',
        questionType: 'fill_blanks',
        difficulty: 'easy',
        marks: 2,
        negativeMarks: 0,
        questionText: 'The value of sin²(45°) + cos²(45°) is equal to ______.',
        correctAnswer: ['1', 'one'],
        explanation: 'By fundamental trigonometric identity sin²θ + cos²θ = 1 for any angle θ.',
        createdBy: teachers[0]._id,
      },
      {
        classGrade: 'Class 10',
        subject: 'Mathematics Standard',
        chapter: 'Mensuration',
        topic: 'Circles',
        questionType: 'numerical',
        difficulty: 'medium',
        marks: 3,
        negativeMarks: 0.5,
        questionText: 'If the radius of a circle is 7 cm, find its circumference in cm. (Take π = 22/7)',
        correctAnswer: 44,
        numericalTolerance: 0.1,
        explanation: 'Circumference = 2πr = 2 * (22/7) * 7 = 44 cm.',
        createdBy: teachers[0]._id,
      },
      {
        classGrade: 'Class 10',
        subject: 'Mathematics Standard',
        chapter: 'Triangles',
        topic: 'Similarity Criteria',
        questionType: 'match_following',
        difficulty: 'medium',
        marks: 4,
        negativeMarks: 0,
        questionText: 'Match each theorem on the left with its corresponding mathematical condition on the right:',
        matchPairs: [
          { id: 'mp_1', left: 'Thales Theorem (BPT)', right: 'Parallel line divides two sides in same ratio' },
          { id: 'mp_2', left: 'Pythagoras Theorem', right: 'Hypotenuse² = Base² + Perpendicular²' },
          { id: 'mp_3', left: 'AAA Similarity', right: 'Corresponding angles are equal' },
          { id: 'mp_4', left: 'SSS Similarity', right: 'All corresponding sides are proportional' },
        ],
        correctAnswer: [
          { left: 'Thales Theorem (BPT)', right: 'Parallel line divides two sides in same ratio' },
          { left: 'Pythagoras Theorem', right: 'Hypotenuse² = Base² + Perpendicular²' },
          { left: 'AAA Similarity', right: 'Corresponding angles are equal' },
          { left: 'SSS Similarity', right: 'All corresponding sides are proportional' },
        ],
        explanation: 'Definitions directly follow NCERT Class 10 Chapter 6 Triangles.',
        createdBy: teachers[0]._id,
      },
      {
        classGrade: 'Class 10',
        subject: 'Mathematics Standard',
        chapter: 'Linear Equations',
        topic: 'Consistency',
        questionType: 'assertion_reason',
        difficulty: 'hard',
        marks: 2,
        negativeMarks: 0.5,
        questionText: 'Assertion (A): The pair of linear equations 2x + 3y = 7 and 4x + 6y = 14 has infinitely many solutions.\nReason (R): For coincident lines, a1/a2 = b1/b2 = c1/c2.',
        options: [
          { id: 'opt_1', text: 'Both A and R are true and R is the correct explanation of A.' },
          { id: 'opt_2', text: 'Both A and R are true but R is not the correct explanation of A.' },
          { id: 'opt_3', text: 'A is true but R is false.' },
          { id: 'opt_4', text: 'A is false but R is true.' },
        ],
        correctAnswer: 'opt_1',
        explanation: 'a1/a2 = 2/4 = 1/2, b1/b2 = 3/6 = 1/2, c1/c2 = 7/14 = 1/2. Lines are coincident.',
        createdBy: teachers[0]._id,
      },
      {
        classGrade: 'Class 10',
        subject: 'Mathematics Standard',
        chapter: 'Trigonometry',
        topic: 'Heights and Distances',
        questionType: 'short_answer',
        difficulty: 'medium',
        marks: 4,
        negativeMarks: 0,
        questionText: 'A tower stands vertically on the ground. From a point on the ground, which is 15 m away from the foot of the tower, the angle of elevation of the top of the tower is found to be 60°. Explain the steps to determine the height of the tower.',
        correctAnswer: 'Height h = 15 * tan(60°) = 15√3 ≈ 25.98 m.',
        explanation: 'Let AB be the tower of height h. Distance BC = 15 m. tan(60°) = AB/BC => √3 = h/15 => h = 15√3 m.',
        createdBy: teachers[0]._id,
      },
      {
        classGrade: 'Class 10',
        subject: 'Mathematics Standard',
        chapter: 'Statistics',
        topic: 'Mean and Median',
        questionType: 'long_answer',
        difficulty: 'hard',
        marks: 6,
        negativeMarks: 0,
        questionText: 'Explain the relationship between Mean, Median, and Mode in a moderately skewed distribution (Empirical formula). Derive and illustrate with a step-by-step example how to estimate the mode if Mean = 30 and Median = 32.',
        correctAnswer: 'Mode = 3(Median) - 2(Mean) = 3(32) - 2(30) = 96 - 60 = 36.',
        explanation: 'The empirical relationship established by Karl Pearson is Mode = 3*Median - 2*Mean.',
        createdBy: teachers[0]._id,
      },
    ];

    const createdQuestions = await Question.create(sampleQuestions);
    console.log(`📚 Question Bank seeded with ${createdQuestions.length} comprehensive questions!`);

    // 6. Create a Published / Ready-to-Take Examination
    const now = new Date();
    const startTime = new Date(now.getTime() - 10 * 60 * 1000); // Started 10 mins ago
    const endTime = new Date(now.getTime() + 180 * 60 * 1000); // Ends in 3 hours

    const sectionAQuestions = createdQuestions.slice(0, 5).map((q, idx) => ({
      questionId: q._id,
      questionText: q.questionText,
      questionType: q.questionType,
      difficulty: q.difficulty,
      chapter: q.chapter,
      topic: q.topic,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      numericalTolerance: q.numericalTolerance,
      matchPairs: q.matchPairs,
      order: idx + 1,
    }));

    const sectionBQuestions = createdQuestions.slice(5, 8).map((q, idx) => ({
      questionId: q._id,
      questionText: q.questionText,
      questionType: q.questionType,
      difficulty: q.difficulty,
      chapter: q.chapter,
      topic: q.topic,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      numericalTolerance: q.numericalTolerance,
      matchPairs: q.matchPairs,
      order: idx + 1,
    }));

    const sectionCQuestions = createdQuestions.slice(8, 10).map((q, idx) => ({
      questionId: q._id,
      questionText: q.questionText,
      questionType: q.questionType,
      difficulty: q.difficulty,
      chapter: q.chapter,
      topic: q.topic,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      numericalTolerance: q.numericalTolerance,
      matchPairs: q.matchPairs,
      order: idx + 1,
    }));

    const totalMarks = createdQuestions.reduce((acc, q) => acc + q.marks, 0);

    const exam = await Examination.create({
      title: 'Class 10 CBSE Mid-Term Mathematics Assessment 2026',
      examCode: 'EXM-MTH-2026-1001',
      category: 'mid_term',
      schoolId: 'SCH-DEFAULT',
      academicYear: '2025-2026',
      classGrade: 'Class 10',
      sections: ['A', 'B'],
      subject: 'Mathematics Standard',
      description: 'Official Online Term-1 Summative Examination with Competitive Testing Engine.',
      instructions: '1. All questions are compulsory.\n2. Section A contains MCQs and True/False with negative marking (0.5 marks).\n3. Use the on-screen palette to flag questions for review.\n4. Answers are autosaved incrementally.\n5. Do not switch browser tabs.',
      createdBy: teachers[0]._id,
      status: 'scheduled',
      reviewedBy: principal._id,
      reviewComments: 'Approved. Question coverage adheres to the CBSE Class 10 Term-1 blueprint.',
      reviewedAt: new Date(),
      examDate: now,
      startTime,
      endTime,
      durationMinutes: 90,
      lateStartPolicy: 'allow_with_reduced_time',
      autoSubmitAtDeadline: true,
      resultPublicationMode: 'manual',
      totalMarks,
      passingMarks: Math.round(totalMarks * 0.4),
      negativeMarkingEnabled: true,
      defaultNegativeMarks: 0.5,
      partialMarkingEnabled: true,
      evaluationMethod: 'hybrid',
      questionNavigation: 'free',
      allowPreviousNavigation: true,
      randomizeQuestionOrder: false,
      randomizeOptionOrder: false,
      questionsPerPage: 1,
      sectionNavigation: 'flexible',
      calculatorAllowed: true,
      reviewBeforeSubmit: true,
      maxAttempts: 2,
      tabSwitchLimit: 3,
      examSections: [
        {
          id: 'sec_a',
          title: 'Section A - Objective & Reasoning',
          description: 'Single MCQ, Multiple Select, and True/False',
          durationMinutes: 30,
          totalMarks: sectionAQuestions.reduce((a, b) => a + b.marks, 0),
          questions: sectionAQuestions,
        },
        {
          id: 'sec_b',
          title: 'Section B - Numerical & Matching',
          description: 'Numerical Answers, Match the Following, and Assertion-Reasoning',
          durationMinutes: 30,
          totalMarks: sectionBQuestions.reduce((a, b) => a + b.marks, 0),
          questions: sectionBQuestions,
        },
        {
          id: 'sec_c',
          title: 'Section C - Descriptive & Case Study',
          description: 'Short and Long Answers requiring teacher evaluation',
          durationMinutes: 30,
          totalMarks: sectionCQuestions.reduce((a, b) => a + b.marks, 0),
          questions: sectionCQuestions,
        },
      ],
    });

    console.log(`📝 Live Examination created: "${exam.title}" (${exam.examCode})`);
    console.log('🎉 Seeding successfully finished!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
