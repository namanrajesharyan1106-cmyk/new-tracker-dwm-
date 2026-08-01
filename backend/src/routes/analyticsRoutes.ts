import { Router } from 'express';
import { 
  getExecutiveDashboardMetrics, getProjectAnalytics, 
  getEmployeeLeaderboards, getReportData 
} from '../controllers/analyticsController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.get('/executive', authorize('SUPER_ADMIN', 'DEPARTMENT_ADMIN'), getExecutiveDashboardMetrics);
router.get('/projects', authorize('SUPER_ADMIN', 'DEPARTMENT_ADMIN'), getProjectAnalytics);
router.get('/leaderboards', authorize('SUPER_ADMIN', 'DEPARTMENT_ADMIN'), getEmployeeLeaderboards);
router.get('/reports', authorize('SUPER_ADMIN', 'DEPARTMENT_ADMIN'), getReportData);

export default router;
