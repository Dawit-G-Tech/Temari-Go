import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
	try {
		const header = req.headers['authorization'];
		if (!header || !header.startsWith('Bearer ')) {
			return next({ status: 401, code: 'UNAUTHORIZED', message: 'Access denied.' });
		}
		const token = header.substring('Bearer '.length).trim();
		const payload = verifyAccessToken(token);
		req.user = { id: payload.userId, email: payload.email, role: payload.role };
		return next();
	} catch (err: any) {
		if (err?.name === 'TokenExpiredError') {
			return next({ status: 401, code: 'TOKEN_EXPIRED', message: 'Token has expired.' });
		}
		return next({ status: 401, code: 'INVALID_TOKEN', message: 'Invalid token.' });
	}
}

export default authMiddleware;


