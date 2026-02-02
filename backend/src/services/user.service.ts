import { db } from '../../models';
const { User, Role } = db;

export interface UpdateProfileInput {
	name?: string;
	phone_number?: string | null;
	username?: string | null;
	language_preference?: string | null;
}

export class UserService {
	static async getMe(userId: string) {
		const user = await User.findByPk(userId, { include: [Role] });
		if (!user) throw { status: 404, code: 'USER_NOT_FOUND', message: 'User not found.' };
		return {
			id: String(user.id),
			name: user.name,
			email: user.email,
			role: user.role?.name || 'user',
			phone_number: user.phone_number ?? null,
			username: user.username ?? null,
			language_preference: user.language_preference ?? 'en',
		};
	}

	static async updateProfile(userId: string, input: UpdateProfileInput) {
		const user = await User.findByPk(userId);
		if (!user) throw { status: 404, code: 'USER_NOT_FOUND', message: 'User not found.' };
		const updates: Record<string, unknown> = {};
		if (input.name !== undefined) updates.name = input.name;
		if (input.phone_number !== undefined) updates.phone_number = input.phone_number;
		if (input.username !== undefined) updates.username = input.username;
		if (input.language_preference !== undefined) updates.language_preference = input.language_preference;
		await user.update(updates);
		return UserService.getMe(userId);
	}

	static async updateFCMToken(userId: string, fcmToken: string) {
		const user = await User.findByPk(userId);
		if (!user) throw { status: 404, code: 'USER_NOT_FOUND', message: 'User not found.' };
		await user.update({ fcm_token: fcmToken });
		return { success: true, message: 'FCM token updated successfully' };
	}
}


