import { Router } from 'express';
import { getMyDailyPlan, updateMyDailyPlan, getAllDailyPlansLive } from '../controllers/dailyPlanController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.route('/today')
  .get(getMyDailyPlan)
  .post(updateMyDailyPlan);

router.route('/admin-live')
  .get(authorize('SUPER_ADMIN', 'DEPARTMENT_ADMIN'), getAllDailyPlansLive);

export default router;
