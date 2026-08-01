import { Router } from 'express';
import { getTemplates, createTemplate, applyTemplateToProject } from '../controllers/templateController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.route('/')
  .get(getTemplates)
  .post(authorize('SUPER_ADMIN', 'DEPARTMENT_ADMIN'), createTemplate);

router.post('/apply/:projectId', authorize('SUPER_ADMIN', 'DEPARTMENT_ADMIN'), applyTemplateToProject);

export default router;
