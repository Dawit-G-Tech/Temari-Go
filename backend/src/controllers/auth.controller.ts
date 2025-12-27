import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import passport from '../config/passport';
import { signAccessToken, signRefreshToken } from '../utils/jwt';
import { db } from '../../models';
const { RefreshToken } = db;

export const register = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { name, email, password } = req.body || {};
		if (!name || !email || !password) {
			return next({ status: 400, code: 'VALIDATION_ERROR', message: 'Name, email and password are required.' });
		}
		const result = await AuthService.register({ name, email, password });
		return res.status(201).json({ success: true, data: result });
	} catch (err) {
		return next(err);
	}
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { email, password } = req.body || {};
		if (!email || !password) {
			return next({ status: 400, code: 'VALIDATION_ERROR', message: 'Email and password are required.' });
		}
		const result = await AuthService.login({ email, password });
		return res.json({ success: true, data: result });
	} catch (err) {
		return next(err);
	}
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { refreshToken } = req.body || {};
		if (!refreshToken) {
			return next({ status: 400, code: 'VALIDATION_ERROR', message: 'refreshToken is required.' });
		}
		const result = await AuthService.refresh(refreshToken);
		return res.json({ success: true, data: result });
	} catch (err) {
		return next(err);
	}
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { refreshToken } = req.body || {};
		if (!refreshToken) {
			return next({ status: 400, code: 'VALIDATION_ERROR', message: 'refreshToken is required.' });
		}
		await AuthService.logout(refreshToken);
		return res.json({ success: true, data: { loggedOut: true } });
	} catch (err) {
		return next(err);
	}
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { email } = req.body || {};
		if (!email) {
			return next({ status: 400, code: 'VALIDATION_ERROR', message: 'Email is required.' });
		}
		const result = await AuthService.forgotPassword({ email });
		return res.json({ success: true, data: result });
	} catch (err) {
		return next(err);
	}
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { token, password } = req.body || {};
		if (!token || !password) {
			return next({ status: 400, code: 'VALIDATION_ERROR', message: 'Token and password are required.' });
		}
		const result = await AuthService.resetPassword({ token, password });
		return res.json({ success: true, data: result });
	} catch (err) {
		return next(err);
	}
};

// Google OAuth routes
export const googleAuth = passport.authenticate('google', {
	scope: ['profile', 'email']
});

export const googleCallback = [
	passport.authenticate('google', { failureRedirect: '/sign-in?error=authentication_failed' }),
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			console.log('Google callback - req.user:', req.user);
			console.log('Google callback - req.session:', req.session);
			const user = req.user as any;
			if (!user) {
				console.log('Google callback - No user found');
				return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/sign-in?error=authentication_failed`);
			}

			// Generate tokens for the user
			const roleName = user.role?.name || 'user';
			const { token: accessToken, expiresIn: accessTokenExpiresIn } = signAccessToken({ 
				id: String(user.id), 
				email: user.email, 
				role: roleName 
			});
			const { token: refreshToken, expiresIn: refreshTokenExpiresIn } = signRefreshToken({ 
				id: String(user.id), 
				email: user.email, 
				role: roleName 
			});

			// Save refresh token to database
			const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
			await RefreshToken.create({ 
				token: refreshToken, 
				expiryDate: refreshTokenExpiry, 
				userId: user.id 
			});

			// Redirect to frontend with tokens
			const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
			const redirectUrl = `${frontendUrl}/callback?accessToken=${accessToken}&refreshToken=${refreshToken}&user=${encodeURIComponent(JSON.stringify({
				id: String(user.id),
				name: user.name,
				email: user.email,
				role: roleName,
				avatar: user.avatar
			}))}`;
			
			res.redirect(redirectUrl);
		} catch (err) {
			return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/sign-in?error=authentication_failed`);
		}
	}
];




