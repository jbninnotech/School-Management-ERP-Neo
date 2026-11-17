import AcademicStructure from '../models/academicModel.js';

const DEFAULT_CLASSES = [
  { name: 'Nursery', code: 'NUR', level: 'pre_primary', sections: ['A', 'B'], subjects: ['Rhymes & Story', 'Numbers', 'General Awareness', 'Art & Craft'] },
  { name: 'LKG', code: 'LKG', level: 'pre_primary', sections: ['A', 'B'], subjects: ['English', 'Rhymes & Story', 'Numbers', 'General Awareness', 'Art & Craft'] },
  { name: 'UKG', code: 'UKG', level: 'pre_primary', sections: ['A', 'B'], subjects: ['English', 'Mathematics', 'General Awareness', 'Hindi', 'Drawing'] },
  { name: 'Class 1', code: 'C01', level: 'primary', sections: ['A', 'B', 'C'], subjects: ['English', 'Mathematics', 'Environmental Studies', 'Hindi', 'Computer Science'] },
  { name: 'Class 2', code: 'C02', level: 'primary', sections: ['A', 'B', 'C'], subjects: ['English', 'Mathematics', 'Environmental Studies', 'Hindi', 'Computer Science'] },
  { name: 'Class 3', code: 'C03', level: 'primary', sections: ['A', 'B', 'C'], subjects: ['English', 'Mathematics', 'Science', 'Social Science', 'Hindi', 'Computer Science'] },
  { name: 'Class 4', code: 'C04', level: 'primary', sections: ['A', 'B', 'C'], subjects: ['English', 'Mathematics', 'Science', 'Social Science', 'Hindi', 'Computer Science'] },
  { name: 'Class 5', code: 'C05', level: 'primary', sections: ['A', 'B', 'C'], subjects: ['English', 'Mathematics', 'Science', 'Social Science', 'Hindi', 'Computer Science'] },
  { name: 'Class 6', code: 'C06', level: 'middle', sections: ['A', 'B', 'C'], subjects: ['English', 'Mathematics', 'General Science', 'Social Science', 'Hindi', 'Sanskrit', 'Computer Applications'] },
  { name: 'Class 7', code: 'C07', level: 'middle', sections: ['A', 'B', 'C'], subjects: ['English', 'Mathematics', 'General Science', 'Social Science', 'Hindi', 'Sanskrit', 'Computer Applications'] },
  { name: 'Class 8', code: 'C08', level: 'middle', sections: ['A', 'B', 'C'], subjects: ['English', 'Mathematics', 'General Science', 'Social Science', 'Hindi', 'Sanskrit', 'Computer Applications'] },
  { name: 'Class 9', code: 'C09', level: 'secondary', sections: ['A', 'B', 'C', 'D'], subjects: ['English Language & Lit', 'Mathematics', 'Science (Phy/Chem/Bio)', 'Social Science', 'Hindi', 'Information Technology'] },
  { name: 'Class 10', code: 'C10', level: 'secondary', sections: ['A', 'B', 'C', 'D'], subjects: ['English Language & Lit', 'Mathematics Standard', 'Mathematics Basic', 'Science (Phy/Chem/Bio)', 'Social Science', 'Hindi', 'Information Technology'] },
  { name: 'Class 11', code: 'C11', level: 'senior_secondary', sections: ['Science', 'Commerce', 'Humanities'], subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Accountancy', 'Business Studies', 'Economics', 'History', 'Political Science', 'Computer Science', 'English Core'] },
  { name: 'Class 12', code: 'C12', level: 'senior_secondary', sections: ['Science', 'Commerce', 'Humanities'], subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Accountancy', 'Business Studies', 'Economics', 'History', 'Political Science', 'Computer Science', 'English Core'] },
];

export const getAcademicStructure = async (req, res, next) => {
  try {
    let structure = await AcademicStructure.findOne({ isDefault: true });
    if (!structure) {
      structure = await AcademicStructure.create({
        academicYear: '2025-2026',
        classes: DEFAULT_CLASSES,
        isDefault: true,
      });
    }

    res.status(200).json({
      success: true,
      data: structure,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAcademicStructure = async (req, res, next) => {
  try {
    const { academicYear, classes } = req.body;
    let structure = await AcademicStructure.findOne({ isDefault: true });

    if (!structure) {
      structure = new AcademicStructure({ isDefault: true });
    }

    if (academicYear) structure.academicYear = academicYear;
    if (classes) structure.classes = classes;

    await structure.save();

    res.status(200).json({
      success: true,
      message: 'Academic structure updated successfully',
      data: structure,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/academic/subjects (or /api/subjects)
 * Returns dynamic list of subjects from academic structure
 * Supports query params: classGrade, academicYear, search
 */
export const getSubjects = async (req, res, next) => {
  try {
    const { classGrade, search, academicYear = '2025-2026' } = req.query;
    let structure = await AcademicStructure.findOne({ isDefault: true });

    if (!structure) {
      structure = await AcademicStructure.create({
        academicYear,
        classes: DEFAULT_CLASSES,
        isDefault: true,
      });
    }

    let subjectsSet = new Set();
    const classList = structure.classes || [];

    if (classGrade) {
      const targetClass = classList.find(
        (c) => c.name.toLowerCase() === classGrade.toLowerCase() || c.code?.toLowerCase() === classGrade.toLowerCase()
      );
      if (targetClass && targetClass.subjects) {
        targetClass.subjects.forEach((s) => subjectsSet.add(s));
      }
    } else {
      classList.forEach((c) => {
        if (c.subjects) {
          c.subjects.forEach((s) => subjectsSet.add(s));
        }
      });
    }

    let result = Array.from(subjectsSet).map((subName) => ({
      name: subName,
      code: subName.substring(0, 4).toUpperCase(),
      isActive: true,
    }));

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((item) => item.name.toLowerCase().includes(q));
    }

    result.sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
