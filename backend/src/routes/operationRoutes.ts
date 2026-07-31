import { Router } from 'express';
import { getMyEveningClosing, submitEveningClosing, getAdminAnalytics } from '../controllers/operationController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.route('/closing')
  .get(getMyEveningClosing)
  .post(submitEveningClosing);

router.route('/analytics')
  .get(authorize('SUPER_ADMIN', 'DEPARTMENT_ADMIN'), getAdminAnalytics);

export default router;
