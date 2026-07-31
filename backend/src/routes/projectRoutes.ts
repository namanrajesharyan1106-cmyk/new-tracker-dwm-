import { Router } from 'express';
import { getProjects, createProject } from '../controllers/projectController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.route('/')
  .get(getProjects)
  .post(createProject);

export default router;
