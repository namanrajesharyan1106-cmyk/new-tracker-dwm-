import { Router } from 'express';
import { 
  getSections, createSection, updateSection, deleteSection,
  getTeams, createTeam, updateTeam, deleteTeam,
  getUsers, adminCreateUser, updateUser, deleteUser, approveUser, updateUserMappings,
  getTreeData, deactivateUser, activateUser, getUserStats, updateUserRole, updateTeamHierarchy
} from '../controllers/masterDataController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = Router();

// Only Super Admins and Department Admins can access Master Data
router.use(protect);
router.use(authorize('SUPER_ADMIN', 'DEPARTMENT_ADMIN'));

// Tree View Endpoint
router.get('/tree', getTreeData);

// Sections
router.route('/sections')
  .get(getSections)
  .post(createSection);

router.route('/sections/:id')
  .put(updateSection)
  .delete(deleteSection);

// Teams
router.route('/teams')
  .get(getTeams)
  .post(createTeam);

router.route('/teams/:id')
  .put(updateTeam)
  .delete(deleteTeam);

router.put('/teams/:id/hierarchy', updateTeamHierarchy);

// Users
router.route('/users')
  .get(getUsers)
  .post(adminCreateUser);

router.route('/users/:id')
  .put(updateUser)
  .delete(deleteUser);

router.get('/users/:id/stats', getUserStats);
router.post('/users/:id/mappings', updateUserMappings);
router.put('/users/:id/mappings', updateUserMappings);
router.put('/users/:id/teams', updateUserMappings);
router.put('/users/:id/role', updateUserRole);
router.patch('/users/:id/approve', approveUser);
router.patch('/users/:id/deactivate', deactivateUser);
router.patch('/users/:id/activate', activateUser);

export default router;
