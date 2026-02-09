import { Router } from 'express';
import { getMe, updateMe, updateFCMToken, getDrivers, getParents } from '../controllers/user.controller';
import authMiddleware from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

router.get('/me', authMiddleware, getMe);
router.put('/me', authMiddleware, updateMe);
router.post('/fcm-token', authMiddleware, updateFCMToken);

router.get('/drivers', authMiddleware, getDrivers);

// List all parents (admin only; used for student form parent selector)
router.get('/parents', authMiddleware, authorize('admin'), getParents);

export default router;


