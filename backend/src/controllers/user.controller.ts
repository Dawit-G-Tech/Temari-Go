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


