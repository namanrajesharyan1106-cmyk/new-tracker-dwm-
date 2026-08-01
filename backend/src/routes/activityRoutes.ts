import { Router } from 'express';
import { getActivities, createActivity, updateActivity, deleteActivity } from '../controllers/activityController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.route('/')
  .get(getActivities)
  .post(createActivity);

router.route('/:id')
  .put(updateActivity)
  .delete(deleteActivity);

export default router;
