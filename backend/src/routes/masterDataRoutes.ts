import { Router } from 'express';
import { createSection, getSections, createTeam, getTeams, getUsers, approveUser, adminCreateUser } from '../controllers/masterDataController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = Router();

// Only Admins can manage master data
router.use(protect);
router.use(authorize('SUPER_ADMIN', 'DEPARTMENT_ADMIN'));

router.route('/sections').post(createSection).get(getSections);
router.route('/teams').post(createTeam).get(getTeams);
router.route('/users').get(getUsers).post(adminCreateUser);
router.route('/users/:id/approve').put(approveUser);

export default router;
