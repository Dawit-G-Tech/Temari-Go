import { Router } from 'express';
import { sendTestNotification } from '../controllers/notification.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

router.post('/test', authMiddleware, sendTestNotification);

export default router;
