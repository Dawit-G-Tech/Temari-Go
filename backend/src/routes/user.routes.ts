import { Router } from 'express';
import { getMe, updateMe, updateFCMToken } from '../controllers/user.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

router.get('/me', authMiddleware, getMe);
router.put('/me', authMiddleware, updateMe);
router.post('/fcm-token', authMiddleware, updateFCMToken);

export default router;


