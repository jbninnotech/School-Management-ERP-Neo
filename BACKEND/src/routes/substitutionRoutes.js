import { Router } from 'express';
import {
  getImpactedPeriods,
  proposeSubstitute,
  adminAssignSubstitute,
  respondToSubstitution,
  getMySubstitutionRequests,
  getAdminSubstitutions,
} from '../controllers/substitutionController.js';
import { protect, authorizeAdmin, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(protect);

router.get('/my-requests', authorize('teacher'), getMySubstitutionRequests);
router.patch('/:id/respond', authorize('teacher'), respondToSubstitution);

router.get('/impacted/:leaveId', getImpactedPeriods);
router.post('/propose', proposeSubstitute);

router.get('/admin', authorizeAdmin, getAdminSubstitutions);
router.patch('/:id/assign', authorizeAdmin, adminAssignSubstitute);

export default router;
