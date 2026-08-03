import { Router } from 'express';
import {
  getMorningPlanningSummary, submitMorningPlan, submitEveningClosing,
  getDailyTimelineAndSummary, getTomorrowSuggestions, getAllDailyPlansLive,
  getTeamMorningMeetingView, getTeamEveningClosingView, reviewDailyClosing,
  getPlannedVsActualReport, getSuperAdminOperationsOverview,
  approveOrRejectDailyPlan, unlockDailyPlan,
  getMeetingNotes, createMeetingNote, getDepartmentDashboardMetrics
} from '../controllers/dailyPlanController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.get('/morning-summary', getMorningPlanningSummary);
router.post('/morning', submitMorningPlan);
router.post('/closing', submitEveningClosing);
router.get('/timeline-summary', getDailyTimelineAndSummary);
router.get('/tomorrow-suggestions', getTomorrowSuggestions);

router.get('/team-meeting', getTeamMorningMeetingView);
router.get('/team-closing', getTeamEveningClosingView);
router.post('/closing/:id/review', authorize('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEAM_LEAD'), reviewDailyClosing);
router.get('/planned-vs-actual', getPlannedVsActualReport);
router.get('/admin-operations-summary', getSuperAdminOperationsOverview);

router.get('/meeting-notes', getMeetingNotes);
router.post('/meeting-notes', createMeetingNote);

router.post('/:id/approve', authorize('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEAM_LEAD'), approveOrRejectDailyPlan);
router.post('/:id/unlock', authorize('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEAM_LEAD'), unlockDailyPlan);
router.get('/department-metrics', authorize('SUPER_ADMIN', 'DEPARTMENT_ADMIN'), getDepartmentDashboardMetrics);
router.get('/admin-live', authorize('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEAM_LEAD'), getAllDailyPlansLive);

export default router;
