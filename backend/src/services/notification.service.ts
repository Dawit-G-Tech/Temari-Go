import { db } from '../../models';
import { getMessaging, isFirebaseInitialized } from '../config/firebase';
import * as admin from 'firebase-admin';
import { Op } from 'sequelize';
const { Notification, User, Role, Route, RouteAssignment, Student } = db;

/**
 * Notification Service
 * Handles FCM push notifications and notification logging
 */

export interface NotificationData {
	userId: number;
	type: string;
	message: string;
	data?: Record<string, any>;
}

export class NotificationService {
	/**
	 * Send FCM notification to a user
	 * @param userId - User ID to send notification to
	 * @param type - Notification type (e.g., 'boarding', 'exiting', 'alcohol_alert')
	 * @param message - Notification message body
	 * @param data - Additional data payload (optional)
	 * @returns Promise that resolves when notification is sent
	 */
	static async sendFCMNotification(
		userId: number,
		type: string,
		message: string,
		data?: Record<string, any>
	): Promise<void> {
		try {
			// Check if Firebase is initialized
			if (!isFirebaseInitialized()) {
				console.warn('Firebase Admin SDK not initialized. Skipping FCM notification.');
				return;
			}

			// Get user with FCM token
			const user = await User.findByPk(userId);
			if (!user) {
				console.warn(`User ${userId} not found. Cannot send FCM notification.`);
				return;
			}

			// Check if user has FCM token
			if (!user.fcm_token) {
				console.warn(`User ${userId} does not have an FCM token. Skipping push notification.`);
				return;
			}

			// Get notification title based on type
			const title = this.getNotificationTitle(type);

			// Prepare FCM message
			const fcmMessage: admin.messaging.Message = {
				token: user.fcm_token,
				notification: {
					title,
					body: message,
				},
				data: {
					type,
					message,
					userId: userId.toString(),
					timestamp: new Date().toISOString(),
					// Add custom data fields (convert all values to strings as FCM requires)
					...(data &&
						Object.keys(data).reduce((acc, key) => {
							const value = data[key];
							acc[key] = typeof value === 'string' ? value : JSON.stringify(value);
							return acc;
						}, {} as Record<string, string>)),
				},
				// Android-specific options
				android: {
					priority: 'high' as const,
					notification: {
						sound: 'default',
						channelId: 'default',
					},
				},
				// iOS-specific options
				apns: {
					payload: {
						aps: {
							sound: 'default',
							badge: 1,
						},
					},
				},
			};

			// Send FCM notification
			const messaging = getMessaging();
			const response = await messaging.send(fcmMessage);
			console.log(`FCM notification sent successfully to user ${userId}. Message ID: ${response}`);

			// Log notification to database
			await Notification.create({
				user_id: userId,
				type,
				message,
				sent_at: new Date(),
			});
		} catch (error: any) {
			console.error(`Error sending FCM notification to user ${userId}:`, error);

			// Handle specific FCM errors
			if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered') {
				console.warn(`Invalid or unregistered FCM token for user ${userId}. Consider removing the token.`);
				// Optionally: Remove invalid token from user
				// await User.update({ fcm_token: null }, { where: { id: userId } });
			}

			// Still log notification to database even if FCM fails
			try {
				await Notification.create({
					user_id: userId,
					type,
					message,
					sent_at: new Date(),
				});
			} catch (dbError) {
				console.error('Error logging notification to database:', dbError);
			}

			// Don't throw - notification failure shouldn't break the main flow
		}
	}

	/**
	 * Send a notification to a user (wrapper that uses sendFCMNotification)
	 * This method maintains backward compatibility
	 */
	static async sendNotification(data: NotificationData): Promise<void> {
		await this.sendFCMNotification(data.userId, data.type, data.message, data.data);
	}

	/**
	 * Send notification to parent when student boards/exits bus
	 */
	static async sendAttendanceNotification(
		parentId: number,
		studentName: string,
		attendanceType: 'boarding' | 'exiting',
		location?: string
	): Promise<void> {
		const message =
			attendanceType === 'boarding'
				? `${studentName} has boarded the bus${location ? ` at ${location}` : ''}`
				: `${studentName} has exited the bus${location ? ` at ${location}` : ''}`;

		await this.sendNotification({
			userId: parentId,
			type: attendanceType,
			message,
			data: {
				studentName,
				attendanceType,
				location,
				timestamp: new Date().toISOString(),
			},
		});
	}

	/**
	 * Get notification title based on type
	 */
	private static getNotificationTitle(type: string): string {
		const titles: Record<string, string> = {
			boarding: 'Student Boarded Bus',
			exiting: 'Student Exited Bus',
			alcohol_alert: 'Driver Safety Alert',
			critical_motion_alert: 'CRITICAL: Bus Movement After Failed Test',
			payment_confirmation: 'Payment Confirmed',
			missed_bus: 'Missed Bus Alert',
			emergency: 'Emergency Alert',
			speed_violation: 'Speed Violation Alert',
		};
		return titles[type] || 'Notification';
	}

	/**
	 * Get user's notifications with filtering
	 * @param userId - User ID to get notifications for
	 * @param filters - Filter options (type, startDate, endDate, read)
	 * @returns Promise with notifications array
	 */
	static async getNotifications(
		userId: number,
		filters?: {
			type?: string;
			startDate?: Date;
			endDate?: Date;
			read?: boolean;
			limit?: number;
			offset?: number;
		}
	) {
		const where: any = {
			user_id: userId,
		};

		// Filter by type
		if (filters?.type) {
			where.type = filters.type;
		}

		// Filter by date range
		if (filters?.startDate || filters?.endDate) {
			where.sent_at = {};
			if (filters.startDate) {
				where.sent_at[Op.gte] = filters.startDate;
			}
			if (filters.endDate) {
				where.sent_at[Op.lte] = filters.endDate;
			}
		}

		// Filter by read status
		if (filters?.read !== undefined) {
			if (filters.read) {
				where.read_at = { [Op.ne]: null };
			} else {
				where.read_at = null;
			}
		}

		const limit = filters?.limit || 50;
		const offset = filters?.offset || 0;

		const notifications = await Notification.findAndCountAll({
			where,
			order: [['sent_at', 'DESC']],
			limit,
			offset,
			include: [
				{
					model: User,
					attributes: ['id', 'name', 'email'],
				},
			],
		});

		return {
			notifications: notifications.rows,
			total: notifications.count,
			limit,
			offset,
		};
	}

	/**
	 * Mark notification as read
	 * @param notificationId - Notification ID
	 * @param userId - User ID (to verify ownership)
	 * @returns Promise with updated notification
	 */
	static async markAsRead(notificationId: number, userId: number) {
		const notification = await Notification.findOne({
			where: {
				id: notificationId,
				user_id: userId,
			},
		});

		if (!notification) {
			throw new Error('Notification not found or access denied');
		}

		// Only update if not already read
		if (!notification.read_at) {
			notification.read_at = new Date();
			await notification.save();
		}

		return notification;
	}

	/**
	 * Send bulk notifications to multiple users
	 * Supports sending to: all parents, specific route, or specific user IDs
	 * @param targets - Target specification (allParents, routeId, userIds)
	 * @param type - Notification type
	 * @param message - Notification message
	 * @param data - Additional data payload (optional)
	 * @returns Promise with results (sent count, failed count)
	 */
	static async sendBulkNotifications(
		targets: {
			allParents?: boolean;
			routeId?: number;
			userIds?: number[];
		},
		type: string,
		message: string,
		data?: Record<string, any>
	): Promise<{ sent: number; failed: number; total: number }> {
		let userIds: number[] = [];

		// Get user IDs based on target type
		if (targets.allParents) {
			// Get all users with parent role
			const parentRole = await Role.findOne({ where: { name: 'parent' } });
			if (!parentRole) {
				throw new Error('Parent role not found');
			}

			const parents = await User.findAll({
				where: { roleId: parentRole.id },
				attributes: ['id'],
			});

			userIds = parents.map((p) => p.id);
		} else if (targets.routeId) {
			// Get all parents of students assigned to this route
			const route = await Route.findByPk(targets.routeId, {
				include: [
					{
						model: RouteAssignment,
						include: [
							{
								model: Student,
								attributes: ['parent_id'],
							},
						],
					},
				],
			});

			if (!route) {
				throw new Error('Route not found');
			}

			// Extract unique parent IDs from route assignments
			const parentIds = new Set<number>();
			(route as any).routeAssignments?.forEach((assignment: any) => {
				if (assignment.student?.parent_id) {
					parentIds.add(assignment.student.parent_id);
				}
			});

			userIds = Array.from(parentIds);
		} else if (targets.userIds && targets.userIds.length > 0) {
			// Use provided user IDs
			userIds = targets.userIds;
		} else {
			throw new Error('Invalid target specification. Must provide allParents, routeId, or userIds');
		}

		if (userIds.length === 0) {
			return { sent: 0, failed: 0, total: 0 };
		}

		// Send notifications to all target users
		let sent = 0;
		let failed = 0;

		for (const userId of userIds) {
			try {
				await this.sendFCMNotification(userId, type, message, data);
				sent++;
			} catch (error) {
				console.error(`Failed to send notification to user ${userId}:`, error);
				failed++;
			}
		}

		return {
			sent,
			failed,
			total: userIds.length,
		};
	}
}

