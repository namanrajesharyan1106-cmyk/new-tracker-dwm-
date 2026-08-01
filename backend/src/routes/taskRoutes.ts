import { Router } from 'express';
import { 
  createTask, getTasks, getTaskDetails, addTaskComment, updateTask, deleteTask, 
  bulkAssignTasks, cloneTask, updateTaskProgress, createPersonalTask, assignTaskUsers,
  logTaskDelay, logTaskBlock, addWorkLog, verifyTask, triggerRecurringTasks
} from '../controllers/taskController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = Router();

// Protect all task routes
router.use(protect);

// ---- SHARED ROUTES ----
router.get('/', getTasks);
router.get('/:id/details', getTaskDetails);

router.post('/personal', createPersonalTask);
router.post('/trigger-recurring', triggerRecurringTasks);
router.post('/:id/comments', addTaskComment);
router.post('/:id/work-logs', addWorkLog);
router.post('/:id/delay', logTaskDelay);
router.post('/:id/block', logTaskBlock);
router.post('/:id/assign-users', assignTaskUsers);
router.post('/:id/verify', verifyTask);

router.put('/:id/progress', updateTaskProgress);

// ---- ADMIN & TEAM LEADS ROUTES ----
router.post('/', createTask);
router.post('/bulk-assign', bulkAssignTasks);
router.post('/:id/clone', cloneTask);

router.route('/:id')
  .put(updateTask)
  .delete(deleteTask);

export default router;

