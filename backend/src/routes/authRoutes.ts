import { Router } from 'express';
import { login, register, getMe, logout, refresh, forgotPassword, resetPassword } from '../controllers/authController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/refresh', refresh);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes below
router.use(protect);
router.get('/me', getMe);

export default router;
