import { Router } from 'express';
import { createTask, getTasks, updateTaskStatus } from '../controllers/taskController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.route('/')
  .post(createTask)
  .get(getTasks);

router.route('/:id/status')
  .put(updateTaskStatus);

export default router;
