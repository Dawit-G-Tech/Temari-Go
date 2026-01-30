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

/**
 * Get user's notification history
 * GET /api/notifications
 * Query params: type, startDate, endDate, read, limit, offset
 */
export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.user) {
			return next({ status: 401, code: 'UNAUTHORIZED', message: 'Access denied.' });
		}

		const userId = Number(req.user.id);

		// Parse query parameters
		const filters: {
			type?: string;
			startDate?: Date;
			endDate?: Date;
			read?: boolean;
			limit?: number;
			offset?: number;
		} = {};

		if (req.query.type && typeof req.query.type === 'string') {
			filters.type = req.query.type;
		}

		if (req.query.startDate && typeof req.query.startDate === 'string') {
			filters.startDate = new Date(req.query.startDate);
		}

		if (req.query.endDate && typeof req.query.endDate === 'string') {
			filters.endDate = new Date(req.query.endDate);
		}

		if (req.query.read !== undefined) {
			filters.read = req.query.read === 'true' || req.query.read === '1';
		}

		if (req.query.limit) {
			filters.limit = parseInt(req.query.limit as string, 10);
		}

		if (req.query.offset) {
			filters.offset = parseInt(req.query.offset as string, 10);
		}

		const result = await NotificationService.getNotifications(userId, filters);

		return res.json({
			success: true,
			data: result.notifications,
			pagination: {
				total: result.total,
				limit: result.limit,
				offset: result.offset,
			},
		});
	} catch (err) {
		return next(err);
	}
};

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
export const markNotificationAsRead = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.user) {
			return next({ status: 401, code: 'UNAUTHORIZED', message: 'Access denied.' });
		}

		const userId = Number(req.user.id);
		const notificationId = parseInt(req.params.id, 10);

		if (isNaN(notificationId)) {
			return res.status(400).json({
				success: false,
				code: 'INVALID_NOTIFICATION_ID',
				message: 'Invalid notification ID',
			});
		}

		const notification = await NotificationService.markAsRead(notificationId, userId);

		return res.json({
			success: true,
			data: notification,
			message: 'Notification marked as read',
		});
	} catch (err: any) {
		if (err.message === 'Notification not found or access denied') {
			return res.status(404).json({
				success: false,
				code: 'NOTIFICATION_NOT_FOUND',
				message: err.message,
			});
		}
		return next(err);
	}
};

/**
 * Send bulk notifications (Admin only)
 * POST /api/notifications/bulk
 * Body: { targets: { allParents?: boolean, routeId?: number, userIds?: number[] }, type: string, message: string, data?: object }
 */
export const sendBulkNotifications = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.user) {
			return next({ status: 401, code: 'UNAUTHORIZED', message: 'Access denied.' });
		}

		// Check if user is admin
		if (req.user.role !== 'admin') {
			return next({ status: 403, code: 'FORBIDDEN', message: 'Only admins can send bulk notifications.' });
		}

		const { targets, type, message, data } = req.body;

		// Validate required fields
		if (!targets || (!targets.allParents && !targets.routeId && (!targets.userIds || targets.userIds.length === 0))) {
			return res.status(400).json({
				success: false,
				code: 'INVALID_TARGETS',
				message: 'Must provide allParents, routeId, or userIds in targets',
			});
		}

		if (!type || typeof type !== 'string') {
			return res.status(400).json({
				success: false,
				code: 'INVALID_TYPE',
				message: 'Notification type is required',
			});
		}

		if (!message || typeof message !== 'string') {
			return res.status(400).json({
				success: false,
				code: 'INVALID_MESSAGE',
				message: 'Notification message is required',
			});
		}

		const result = await NotificationService.sendBulkNotifications(targets, type, message, data);

		return res.json({
			success: true,
			data: result,
			message: `Bulk notification sent: ${result.sent} successful, ${result.failed} failed out of ${result.total} total`,
		});
	} catch (err: any) {
		if (err.message === 'Parent role not found' || err.message === 'Route not found' || err.message.includes('Invalid target')) {
			return res.status(400).json({
				success: false,
				code: 'INVALID_REQUEST',
				message: err.message,
			});
		}
		return next(err);
	}
};
