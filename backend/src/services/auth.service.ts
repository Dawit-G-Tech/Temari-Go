import { db } from '../../models';
const { User, Role, RefreshToken } = db;
import { hashPassword, comparePassword } from '../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken, signPasswordResetToken, verifyPasswordResetToken } from '../utils/jwt';
import { sendPasswordResetEmail } from '../utils/email';

type RegisterInput = { name: string; email: string; password: string };
type LoginInput = { email: string; password: string };
type ForgotPasswordInput = { email: string };
type ResetPasswordInput = { token: string; password: string };

function parseRefreshExpiryToDate(): Date {
	const raw = process.env.REFRESH_TOKEN_EXPIRY || '7d';
	const now = Date.now();
	const match = /^([0-9]+)([smhd])$/.exec(raw);
	if (!match) return new Date(now + 7 * 24 * 60 * 60 * 1000);
	const value = Number(match[1]);
	const unit = match[2];
	const ms = unit === 's' ? value * 1000 : unit === 'm' ? value * 60 * 1000 : unit === 'h' ? value * 60 * 60 * 1000 : value * 24 * 60 * 60 * 1000;
	return new Date(now + ms);
}

export class AuthService {
	static async register(input: RegisterInput) {
		const existing = await User.findOne({ where: { email: input.email } });
		if (existing) {
			// Check if user is a social auth user
			if (existing.provider && existing.password === 'social-auth-no-password') {
				throw { status: 400, code: 'EMAIL_IN_USE_SOCIAL', message: 'This email is already registered with social authentication. Please use Google to sign in.' };
			}
			throw { status: 400, code: 'EMAIL_IN_USE', message: 'Email already in use.' };
		}
		const password = await hashPassword(input.password);
		// default role: user
		const role = await Role.findOne({ where: { name: 'user' } });
		const user = await User.create({ name: input.name, email: input.email, password, roleId: role?.id });
		
		// Generate tokens for the new user
		const roleName = role?.name || 'user';
		const { token: accessToken, expiresIn: accessTokenExpiresIn } = signAccessToken({ id: String(user.id), email: user.email, role: roleName });
		const { token: refreshToken, expiresIn: refreshTokenExpiresIn } = signRefreshToken({ id: String(user.id), email: user.email, role: roleName });
		await RefreshToken.create({ token: refreshToken, expiryDate: parseRefreshExpiryToDate(), userId: user.id as number });
		
		return {
			user: { id: String(user.id), name: user.name, email: user.email, role: roleName },
			tokens: { accessToken, accessTokenExpiresIn, refreshToken, refreshTokenExpiresIn },
		};
	}

	static async login(input: LoginInput) {
		const user = await User.findOne({ where: { email: input.email }, include: [Role] });
		if (!user) {
			throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
		}
		
		// Check if user is a social auth user (has provider and default password)
		if (user.provider && user.password === 'social-auth-no-password') {
			throw { status: 401, code: 'SOCIAL_AUTH_USER', message: 'This account was created with social authentication. Please use Google or GitHub to sign in.' };
		}
		
		const ok = await comparePassword(input.password, user.password);
		if (!ok) {
			throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
		}
		const roleName = user.role?.name || 'user';
		const { token: accessToken, expiresIn: accessTokenExpiresIn } = signAccessToken({ id: String(user.id), email: user.email, role: roleName });
		const { token: refreshToken, expiresIn: refreshTokenExpiresIn } = signRefreshToken({ id: String(user.id), email: user.email, role: roleName });
		await RefreshToken.create({ token: refreshToken, expiryDate: parseRefreshExpiryToDate(), userId: user.id as number });
		return {
			user: { id: String(user.id), name: user.name, email: user.email, role: roleName },
			tokens: { accessToken, accessTokenExpiresIn, refreshToken, refreshTokenExpiresIn },
		};
	}

	static async refresh(refreshToken: string) {
		// verify signature
		const payload = verifyRefreshToken(refreshToken);
		// verify presence in DB and not expired
		const existing = await RefreshToken.findOne({ where: { token: refreshToken } });
		if (!existing) {
			throw { status: 401, code: 'INVALID_TOKEN', message: 'Invalid token.' };
		}
		if (existing.expiryDate && existing.expiryDate.getTime() < Date.now()) {
			throw { status: 401, code: 'TOKEN_EXPIRED', message: 'Token has expired.' };
		}
		// issue new access token
		const { token: accessToken, expiresIn: accessTokenExpiresIn } = signAccessToken({ id: payload.userId, email: payload.email, role: payload.role });
		return { accessToken, accessTokenExpiresIn };
	}

	static async logout(refreshToken: string) {
		await RefreshToken.destroy({ where: { token: refreshToken } });
		return { success: true };
	}

	static async forgotPassword(input: ForgotPasswordInput) {
		const user = await User.findOne({ where: { email: input.email } });
		if (!user) {
			// Don't reveal if email exists or not for security
			return { success: true, message: 'If the email exists, a password reset link has been sent.' };
		}

		// Check if user is a social auth user
		if (user.provider && user.password === 'social-auth-no-password') {
			throw { status: 400, code: 'SOCIAL_AUTH_USER', message: 'This account was created with social authentication. Please use Google or GitHub to sign in.' };
		}

		// Generate password reset token
		const roleName = 'user'; // Default role for password reset
		const { token: resetToken } = signPasswordResetToken({ 
			id: String(user.id), 
			email: user.email, 
			role: roleName 
		});

		// Send password reset email
		await sendPasswordResetEmail({
			email: user.email,
			resetToken,
			userName: user.name
		});

		return { success: true, message: 'If the email exists, a password reset link has been sent.' };
	}

	static async resetPassword(input: ResetPasswordInput) {
		try {
			// Verify the reset token
			const payload = verifyPasswordResetToken(input.token);
			
			// Find the user
			const user = await User.findOne({ where: { id: payload.userId } });
			if (!user) {
				throw { status: 400, code: 'INVALID_TOKEN', message: 'Invalid or expired reset token.' };
			}

			// Check if user is a social auth user
			if (user.provider && user.password === 'social-auth-no-password') {
				throw { status: 400, code: 'SOCIAL_AUTH_USER', message: 'This account was created with social authentication. Please use Google or GitHub to sign in.' };
			}

			// Hash the new password
			const hashedPassword = await hashPassword(input.password);
			
			// Update the user's password
			await user.update({ password: hashedPassword });

			// Invalidate all refresh tokens for security
			await RefreshToken.destroy({ where: { userId: user.id } });

			return { success: true, message: 'Password has been reset successfully.' };
		} catch (error: any) {
			if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
				throw { status: 400, code: 'INVALID_TOKEN', message: 'Invalid or expired reset token.' };
			}
			throw error;
		}
	}
}


