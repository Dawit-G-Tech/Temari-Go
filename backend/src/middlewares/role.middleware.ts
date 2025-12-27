import { Request, Response, NextFunction } from 'express';

export function authorize(...roles: string[]) {
	return (req: Request, res: Response, next: NextFunction): void => {
		if (!req.user) {
			return next({ status: 401, code: 'UNAUTHORIZED', message: 'Access denied.' });
		}
		if (roles.length > 0 && !roles.includes(req.user.role)) {
			return next({ status: 403, code: 'FORBIDDEN', message: 'Access denied.' });
		}
		return next();
	};
}

export default authorize;


