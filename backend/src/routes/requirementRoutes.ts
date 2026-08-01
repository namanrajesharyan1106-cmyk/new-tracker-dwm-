import { Router } from 'express';
import { getRequirements, getRequirementDetails, assignRequirementTeam } from '../controllers/requirementController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = Router();

// DOPS Requirement workspace routes
router.use(protect);

router.get('/', getRequirements);
router.get('/:id', getRequirementDetails);

// Only Super Admin and Department Admin/Manager can assign team execution
router.put('/:id/assign-team', authorize('SUPER_ADMIN', 'DEPARTMENT_ADMIN'), assignRequirementTeam);

export default router;
