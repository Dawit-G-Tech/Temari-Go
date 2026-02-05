import { Request, Response, NextFunction } from 'express';
import { UserService, type UpdateProfileInput } from '../services/user.service';

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.user) {
			return next({ status: 401, code: 'UNAUTHORIZED', message: 'Access denied.' });
		}
		const user = await UserService.getMe(req.user.id);
		return res.json({ success: true, data: user });
	} catch (err) {
		return next(err);
	}
};

export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.user) {
			return next({ status: 401, code: 'UNAUTHORIZED', message: 'Access denied.' });
		}
		const { name, phone_number, username, language_preference } = req.body as UpdateProfileInput;
		const user = await UserService.updateProfile(req.user.id, {
			name,
			phone_number,
			username,
			language_preference,
		});
		return res.json({ success: true, data: user });
	} catch (err) {
		return next(err);
	}
};

export const updateFCMToken = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.user) {
			return next({ status: 401, code: 'UNAUTHORIZED', message: 'Access denied.' });
		}

		const { fcmToken } = req.body;
		if (!fcmToken || typeof fcmToken !== 'string') {
			return res.status(400).json({
				success: false,
				code: 'INVALID_FCM_TOKEN',
				message: 'FCM token is required and must be a string.',
			});
		}

		const result = await UserService.updateFCMToken(req.user.id, fcmToken);
		return res.json({ success: true, data: result });
	} catch (err) {
		return next(err);
	}
};

export const getDrivers = async (req: Request, res: Response, next: NextFunction) => {
	try {
		// Optionally, you could enforce admin-only here if needed.
		const drivers = await UserService.listDrivers();
		return res.json({ success: true, data: drivers });
	} catch (err) {
		return next(err);
	}
};

