import { Router } from 'express';
import { register, login, refresh, logout, forgotPassword, resetPassword, googleAuth, googleCallback } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// /api/auth/login
// Social auth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

export default router;


