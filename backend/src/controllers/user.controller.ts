import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';

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


