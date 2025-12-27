type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function timestamp(): string {
	return new Date().toISOString();
}

function shouldLogDebug(): boolean {
	const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
	return level === 'debug';
}

export const logger = {
	debug: (...args: unknown[]): void => {
		if (shouldLogDebug()) console.debug(`[${timestamp()}] [DEBUG]`, ...args);
	},
	info: (...args: unknown[]): void => {
		console.info(`[${timestamp()}] [INFO ]`, ...args);
	},
	warn: (...args: unknown[]): void => {
		console.warn(`[${timestamp()}] [WARN ]`, ...args);
	},
	error: (...args: unknown[]): void => {
		console.error(`[${timestamp()}] [ERROR]`, ...args);
	},
};

export default logger;


