import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';

/**
 * Send test notification to the current user
 * POST /api/notifications/test
 */
export const sendTestNotification = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.user) {
			return next({ status: 401, code: 'UNAUTHORIZED', message: 'Access denied.' });
		}

		const userId = Number(req.user.id);
		const message = 'This is a test notification from Temari-Go!';
		const type = 'test';

		await NotificationService.sendFCMNotification(userId, type, message, {
			test: 'true',
			timestamp: new Date().toISOString(),
		});

		return res.json({
			success: true,
			message: 'Test notification sent successfully',
		});
	} catch (err) {
		return next(err);
	}
};
