import { Router } from 'express';
import { 
  createTask, getTasks, updateTask, deleteTask, 
  bulkAssignTasks, cloneTask, updateTaskProgress 
} from '../controllers/taskController';
import { protect, authorize } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validate';
import { taskCreateSchema, taskUpdateSchema, taskProgressSchema, bulkAssignSchema } from '../validators/taskValidator';

const router = Router();

// Protect all task routes
router.use(protect);

// ---- SHARED ROUTES ----
// GET all tasks (filtered by user role inside controller)
router.get('/', getTasks);

// POST personal task (Users & Admins)
router.post('/personal', validate(taskCreateSchema), createTask);

// PUT update progress (Users & Admins)
router.put('/:id/progress', validate(taskProgressSchema), updateTaskProgress);

// ---- ADMIN ONLY ROUTES ----
router.use(authorize('SUPER_ADMIN', 'DEPARTMENT_ADMIN'));

router.post('/', validate(taskCreateSchema), createTask);
router.post('/bulk-assign', validate(bulkAssignSchema), bulkAssignTasks);
router.post('/:id/clone', cloneTask);

router.route('/:id')
  .put(validate(taskUpdateSchema), updateTask)
  .delete(deleteTask);

export default router;
