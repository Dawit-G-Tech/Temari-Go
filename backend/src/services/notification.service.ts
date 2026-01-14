import { db } from '../../models';
const { Notification, User } = db;

/**
 * Notification Service
 * Handles FCM push notifications and notification logging
 * 
 * Note: FCM integration requires firebase-admin setup
 * For now, we'll log notifications to the database
 * FCM implementation can be added later
 */

export interface NotificationData {
	userId: number;
	type: string;
	message: string;
	data?: Record<string, any>;
}

export class NotificationService {
	/**
	 * Send a notification to a user
	 * Currently logs to database, FCM integration to be added
	 */
	static async sendNotification(data: NotificationData): Promise<void> {
		try {
			// Log notification to database
			await Notification.create({
				user_id: data.userId,
				type: data.type,
				message: data.message,
				sent_at: new Date(),
			});

			// TODO: Implement FCM push notification
			// This requires:
			// 1. Firebase Admin SDK setup
			// 2. User FCM token storage
			// 3. FCM message sending logic
			// Example:
			// const user = await User.findByPk(data.userId);
			// if (user?.fcm_token) {
			//   await admin.messaging().send({
			//     token: user.fcm_token,
			//     notification: {
			//       title: getNotificationTitle(data.type),
			//       body: data.message,
			//     },
			//     data: data.data || {},
			//   });
			// }

			console.log(`Notification sent to user ${data.userId}: ${data.message}`);
		} catch (error) {
			console.error('Error sending notification:', error);
			// Don't throw - notification failure shouldn't break attendance flow
		}
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
			payment_confirmation: 'Payment Confirmed',
			missed_bus: 'Missed Bus Alert',
			emergency: 'Emergency Alert',
			speed_violation: 'Speed Violation Alert',
		};
		return titles[type] || 'Notification';
	}
}

