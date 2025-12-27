import { NextFunction, Request, Response } from 'express';
import logger from '../utils/logger';

type ApiError = {
	status?: number;
	code?: string;
	message?: string;
	details?: unknown;
};

export function errorMiddleware(err: ApiError, req: Request, res: Response, next: NextFunction): void {
	const status = err.status || 500;
	const code = err.code || (status === 500 ? 'INTERNAL_ERROR' : 'ERROR');
	const message = err.message || 'Unexpected error.';

	if (status >= 500) {
		logger.error('Unhandled error', { code, err });
	} else {
		logger.warn('Handled error', { code, err });
	}

	res.status(status).json({
		success: false,
		error: {
			code,
			message,
			details: err.details,
		},
	});
}

export default errorMiddleware;
