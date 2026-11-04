import { Router } from 'express';
import {
  getCascadingCategories,
  searchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  mergeCategory,
} from '../controllers/categoryController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

// Cascading and search: accessible by authenticated users (teachers, admins, students)
router.get('/cascading', protect, getCascadingCategories);
router.get('/search', protect, searchCategories);

// Category Management: Teachers and Admins
router.post('/', protect, authorize('superadmin', 'admin', 'teacher'), createCategory);
router.put('/:id', protect, authorize('superadmin', 'admin', 'teacher'), updateCategory);
router.delete('/:id', protect, authorize('superadmin', 'admin', 'teacher'), deleteCategory);
router.post('/:id/merge', protect, authorize('superadmin', 'admin', 'teacher'), mergeCategory);

export default router;
