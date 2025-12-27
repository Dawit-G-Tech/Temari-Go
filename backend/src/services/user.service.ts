import { db } from '../../models';
const { User, Role } = db;

export class UserService {
	static async getMe(userId: string) {
		const user = await User.findByPk(userId, { include: [Role] });
		if (!user) throw { status: 404, code: 'USER_NOT_FOUND', message: 'User not found.' };
		return { id: String(user.id), name: user.name, email: user.email, role: user.role?.name || 'user' };
	}
}


