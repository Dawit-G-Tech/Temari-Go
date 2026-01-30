import { Router } from 'express';
import {
	sendTestNotification,
	getNotifications,
	markNotificationAsRead,
	sendBulkNotifications,
} from '../controllers/notification.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

// Get user's notifications (with filtering)
router.get('/', authMiddleware, getNotifications);

// Mark notification as read
router.put('/:id/read', authMiddleware, markNotificationAsRead);

// Send bulk notifications (Admin only)
router.post('/bulk', authMiddleware, sendBulkNotifications);

// Send test notification
router.post('/test', authMiddleware, sendTestNotification);

export default router;
