import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import passport from '../config/passport';
import { signAccessToken, signRefreshToken } from '../utils/jwt';
import { db } from '../../models';
const { RefreshToken } = db;

// Helper function to set auth cookies
function setAuthCookies(res: Response, accessToken: string, refreshToken: string, accessTokenExpiresIn: string) {
	const isProduction = process.env.NODE_ENV === 'production';
	const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days for refresh token
	
	// Set access token cookie (short-lived, HTTP-only)
	res.cookie('accessToken', accessToken, {
		httpOnly: true,
		secure: isProduction,
		sameSite: 'lax',
		maxAge: 15 * 60 * 1000, // 15 minutes
		path: '/',
	});

	// Set refresh token cookie (long-lived, HTTP-only)
	res.cookie('refreshToken', refreshToken, {
		httpOnly: true,
		secure: isProduction,
		sameSite: 'lax',
		maxAge,
		path: '/',
	});
}

export const register = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { name, email, password } = req.body || {};
		if (!name || !email || !password) {
			return next({ status: 400, code: 'VALIDATION_ERROR', message: 'Name, email and password are required.' });
		}
		const result = await AuthService.register({ name, email, password });
		
		// Set cookies
		setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken, result.tokens.accessTokenExpiresIn);
		
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
		
		// Set cookies
		setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken, result.tokens.accessTokenExpiresIn);
		
		return res.json({ success: true, data: result });
	} catch (err) {
		return next(err);
	}
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
	try {
		// Try to get refresh token from cookie first, then from body
		const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
		if (!refreshToken) {
			// Return 401 instead of 400 - this is an auth issue, not validation
			return res.status(401).json({
				success: false,
				code: 'UNAUTHORIZED',
				message: 'No refresh token available.',
			});
		}
		const result = await AuthService.refresh(refreshToken);
		
		// Update access token cookie
		const isProduction = process.env.NODE_ENV === 'production';
		res.cookie('accessToken', result.accessToken, {
			httpOnly: true,
			secure: isProduction,
			sameSite: 'lax',
			maxAge: 15 * 60 * 1000, // 15 minutes
			path: '/',
		});
		
		return res.json({ success: true, data: result });
	} catch (err) {
		return next(err);
	}
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
	try {
		// Try to get refresh token from cookie first, then from body
		const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
		if (refreshToken) {
			await AuthService.logout(refreshToken);
		}
		
		// Clear cookies
		res.clearCookie('accessToken', { path: '/' });
		res.clearCookie('refreshToken', { path: '/' });
		
		return res.json({ success: true, data: { loggedOut: true } });
	} catch (err) {
		// Clear cookies even if logout fails
		res.clearCookie('accessToken', { path: '/' });
		res.clearCookie('refreshToken', { path: '/' });
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
				expiry_date: refreshTokenExpiry, 
				user_id: user.id 
			});

			// Set cookies
			setAuthCookies(res, accessToken, refreshToken, accessTokenExpiresIn);

			// Redirect to frontend (cookies are set, no need to pass in URL)
			const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
			const redirectUrl = `${frontendUrl}/callback?user=${encodeURIComponent(JSON.stringify({
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




