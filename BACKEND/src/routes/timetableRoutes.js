import { Router } from 'express';
import {
  upsertTimetableSlot,
  getClassTimetable,
  getLiveTimetable,
  getFreeTeachers,
} from '../controllers/timetableController.js';
import { protect, authorizeAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', getClassTimetable);
router.post('/', authorizeAdmin, upsertTimetableSlot);
router.get('/live', getLiveTimetable);
router.get('/free-teachers', getFreeTeachers);

export default router;
