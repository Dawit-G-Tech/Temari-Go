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

	// Don't log 401 (UNAUTHORIZED) errors - they're expected for unauthenticated requests
	// Don't log 400 (VALIDATION_ERROR) for missing refreshToken - it's expected when not logged in
	const shouldSkipLogging = 
		status === 401 || 
		(status === 400 && code === 'VALIDATION_ERROR' && message.includes('refreshToken'));

	if (status >= 500) {
		logger.error('Unhandled error', { code, err });
	} else if (!shouldSkipLogging) {
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
