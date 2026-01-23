import { db } from '../../models';
import { getMessaging, isFirebaseInitialized } from '../config/firebase';
import * as admin from 'firebase-admin';
const { Notification, User } = db;

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
}

