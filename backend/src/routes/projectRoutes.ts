import { Router } from 'express';
import { getProjects, createProject, syncDrsRequest, getProjectDetails, assignProjectTeams } from '../controllers/projectController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.post('/sync-drs-request', syncDrsRequest);

router.route('/')
  .get(getProjects)
  .post(createProject);

router.get('/:id', getProjectDetails);
router.post('/:id/teams', assignProjectTeams);

export default router;

