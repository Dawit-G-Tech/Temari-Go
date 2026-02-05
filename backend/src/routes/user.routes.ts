import { Router } from 'express';
import { getMe, updateMe, updateFCMToken, getDrivers } from '../controllers/user.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

router.get('/me', authMiddleware, getMe);
router.put('/me', authMiddleware, updateMe);
router.post('/fcm-token', authMiddleware, updateFCMToken);

// List all drivers (authenticated; you can tighten to admin-only via role middleware if needed)
router.get('/drivers', authMiddleware, getDrivers);

export default router;


