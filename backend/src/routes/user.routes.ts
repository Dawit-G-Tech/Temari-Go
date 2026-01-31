import { Router } from 'express';
import { getMe, updateFCMToken } from '../controllers/user.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

router.get('/me', authMiddleware, getMe);
router.post('/fcm-token', authMiddleware, updateFCMToken);

export default router;


