import Category from '../models/categoryModel.js';
import Question from '../models/questionModel.js';
import mongoose from 'mongoose';

/**
 * Build full breadcrumb path string e.g. "Algebra > Linear Equations > Word Problems"
 */
async function buildCategoryPathString(category) {
  if (!category.path || category.path.length === 0) {
    return category.name;
  }
  const ancestors = await Category.find({ _id: { $in: category.path }, isDeleted: false })
    .select('name')
    .lean();
  
  // order by path array order
  const ancestorMap = {};
  ancestors.forEach((a) => {
    ancestorMap[a._id.toString()] = a.name;
  });

  const names = category.path.map((id) => ancestorMap[id.toString()]).filter(Boolean);
  names.push(category.name);
  return names.join(' > ');
}

/**
 * 1. GET /api/categories/cascading
 * Query: subject, classGrade, parentId (null or id), level ('unit'|'topic'|'subtopic'|'child')
 */
export const getCascadingCategories = async (req, res, next) => {
  try {
    const { subject, classGrade, parentId, level } = req.query;

    const filter = { isDeleted: false };
    if (subject) filter.subject = subject;
    if (classGrade) filter.classGrade = classGrade;

    if (level) {
      filter.level = level;
    }

    if (parentId !== undefined) {
      if (!parentId || parentId === 'null' || parentId === '') {
        filter.parentId = null;
      } else {
        filter.parentId = new mongoose.Types.ObjectId(parentId);
      }
    }

    const categories = await Category.find(filter)
      .sort({ order: 1, name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. GET /api/categories/search
 * Query: subject, classGrade, q (search query term)
 * Case-insensitive search on name, returns category with full breadcrumb path string
 */
export const searchCategories = async (req, res, next) => {
  try {
    const { subject, classGrade, q } = req.query;
    if (!q || !q.trim()) {
      return res.status(200).json({ success: true, data: [] });
    }

    const term = q.trim();
    const filter = {
      isDeleted: false,
      name: { $regex: term, $options: 'i' },
    };

    if (subject) filter.subject = subject;
    if (classGrade) filter.classGrade = classGrade;

    const categories = await Category.find(filter).limit(30).lean();

    // Map each with full path string
    const results = await Promise.all(
      categories.map(async (cat) => {
        const fullPath = await buildCategoryPathString(cat);
        return {
          ...cat,
          fullPath,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. POST /api/categories
 * Body: { name, level, parentId, subject, classGrade, order }
 * Enforces:
 * - Duplicate name check under same parentId (subject, classGrade, parentId, name case-insensitive)
 * - Teachers can only create for their own/assigned subject
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, level, parentId, subject, classGrade, order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }
    if (!level || !['unit', 'topic', 'subtopic', 'child'].includes(level)) {
      return res.status(400).json({ success: false, message: 'Valid level (unit, topic, subtopic, child) is required' });
    }
    if (!subject || !classGrade) {
      return res.status(400).json({ success: false, message: 'Subject and Class / Grade are required' });
    }

    // Teacher RBAC check
    if (req.user.role === 'teacher') {
      const allowedSubjects = req.user.teacherProfile?.subjects || [];
      if (allowedSubjects.length > 0 && !allowedSubjects.some((s) => s.toLowerCase() === subject.toLowerCase())) {
        return res.status(403).json({ success: false, message: 'Not authorized to manage categories outside your assigned subjects' });
      }
    }

    const cleanParentId = parentId && parentId !== 'null' ? new mongoose.Types.ObjectId(parentId) : null;

    // Check duplicate name under same parent
    const duplicate = await Category.findOne({
      subject,
      classGrade,
      parentId: cleanParentId,
      name: { $regex: `^${name.trim()}$`, $options: 'i' },
      isDeleted: false,
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Category "${name.trim()}" already exists under this parent level`,
      });
    }

    // Build ancestor path
    let path = [];
    if (cleanParentId) {
      const parentCat = await Category.findById(cleanParentId);
      if (parentCat) {
        path = [...(parentCat.path || []), parentCat._id];
      }
    }

    const newCategory = await Category.create({
      name: name.trim(),
      level,
      parentId: cleanParentId,
      subject,
      classGrade,
      path,
      order: Number(order) || 0,
      createdBy: req.user._id,
    });

    const fullPath = await buildCategoryPathString(newCategory);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: {
        ...newCategory.toObject(),
        fullPath,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. PUT /api/categories/:id
 * Body: { name, order }
 * Teachers can edit only their own or assigned subjects; admin can edit all
 */
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, order } = req.body;

    const category = await Category.findOne({ _id: id, isDeleted: false });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (req.user.role === 'teacher') {
      const isCreator = category.createdBy.toString() === req.user._id.toString();
      const allowedSubjects = req.user.teacherProfile?.subjects || [];
      const hasSubject = allowedSubjects.some((s) => s.toLowerCase() === category.subject.toLowerCase());
      if (!isCreator && !hasSubject) {
        return res.status(403).json({ success: false, message: 'Not authorized to modify this category' });
      }
    }

    if (name && name.trim()) {
      // Check duplicate under parent
      const duplicate = await Category.findOne({
        _id: { $ne: category._id },
        subject: category.subject,
        classGrade: category.classGrade,
        parentId: category.parentId,
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
        isDeleted: false,
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Category "${name.trim()}" already exists under this parent level`,
        });
      }
      category.name = name.trim();
    }

    if (order !== undefined) {
      category.order = Number(order) || 0;
    }

    await category.save();
    const fullPath = await buildCategoryPathString(category);

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: {
        ...category.toObject(),
        fullPath,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. DELETE /api/categories/:id
 * Block deleting if questions are currently using this category (offer move/merge instead)
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findOne({ _id: id, isDeleted: false });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (req.user.role === 'teacher') {
      const isCreator = category.createdBy.toString() === req.user._id.toString();
      const allowedSubjects = req.user.teacherProfile?.subjects || [];
      const hasSubject = allowedSubjects.some((s) => s.toLowerCase() === category.subject.toLowerCase());
      if (!isCreator && !hasSubject) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this category' });
      }
    }

    // Check if category is used by questions
    const questionCount = await Question.countDocuments({
      isArchived: false,
      $or: [
        { unitId: category._id },
        { topicId: category._id },
        { subTopicId: category._id },
        { childTopicId: category._id },
        { chapter: category.name },
        { topic: category.name },
      ],
    });

    if (questionCount > 0) {
      return res.status(409).json({
        success: false,
        isInUse: true,
        message: `Cannot delete category "${category.name}" because it is currently used by ${questionCount} question(s). Move or reassign questions before deleting.`,
        questionCount,
      });
    }

    // Check children
    const childCount = await Category.countDocuments({ parentId: category._id, isDeleted: false });
    if (childCount > 0) {
      return res.status(409).json({
        success: false,
        hasChildren: true,
        message: `Cannot delete category "${category.name}" because it contains ${childCount} sub-category items. Delete or move sub-items first.`,
        childCount,
      });
    }

    category.isDeleted = true;
    category.deletedAt = new Date();
    await category.save();

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. POST /api/categories/:id/merge
 * Merges category into targetCategoryId and reassigns all question references
 */
export const mergeCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { targetCategoryId } = req.body;

    if (!targetCategoryId) {
      return res.status(400).json({ success: false, message: 'Target category ID is required for merge' });
    }

    const sourceCat = await Category.findOne({ _id: id, isDeleted: false });
    const targetCat = await Category.findOne({ _id: targetCategoryId, isDeleted: false });

    if (!sourceCat || !targetCat) {
      return res.status(404).json({ success: false, message: 'Source or target category not found' });
    }

    // Reassign question references
    const levelKey =
      sourceCat.level === 'unit'
        ? 'unitId'
        : sourceCat.level === 'topic'
        ? 'topicId'
        : sourceCat.level === 'subtopic'
        ? 'subTopicId'
        : 'childTopicId';

    const targetLevelKey =
      targetCat.level === 'unit'
        ? 'unitId'
        : targetCat.level === 'topic'
        ? 'topicId'
        : targetCat.level === 'subtopic'
        ? 'subTopicId'
        : 'childTopicId';

    await Question.updateMany(
      { [levelKey]: sourceCat._id },
      { $set: { [targetLevelKey]: targetCat._id } }
    );

    // Soft delete source
    sourceCat.isDeleted = true;
    sourceCat.deletedAt = new Date();
    await sourceCat.save();

    res.status(200).json({
      success: true,
      message: `Category "${sourceCat.name}" successfully merged into "${targetCat.name}"`,
    });
  } catch (err) {
    next(err);
  }
};
