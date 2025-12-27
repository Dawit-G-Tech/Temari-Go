import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

export type UserTokenSubject = {
	id: string;
	email: string;
	role: string;
};

export type AuthTokenPayload = JwtPayload & {
	sub: string;
	userId: string;
	email: string;
	role: string;
};

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

type ExpiresIn = NonNullable<SignOptions['expiresIn']>;

function getAccessConfig() {
	const secret = requireEnv('JWT_ACCESS_SECRET');
	const expiresRaw = process.env.ACCESS_TOKEN_EXPIRY || '15m';
	const expiresIn = expiresRaw as ExpiresIn;
	return { secret, expiresIn } as const;
}

function getRefreshConfig() {
	const secret = requireEnv('JWT_REFRESH_SECRET');
	const expiresRaw = process.env.REFRESH_TOKEN_EXPIRY || '7d';
	const expiresIn = expiresRaw as ExpiresIn;
	return { secret, expiresIn } as const;
}

function baseSignOptions(expiresIn: ExpiresIn): SignOptions {
	return {
		algorithm: 'HS256',
		expiresIn,
	};
}

export function signAccessToken(user: UserTokenSubject): { token: string; expiresIn: string } {
	const { secret, expiresIn } = getAccessConfig();
	const payload: Partial<AuthTokenPayload> = {
		userId: user.id,
		email: user.email,
		role: user.role,
	};
	const token = jwt.sign(payload, secret, { ...baseSignOptions(expiresIn), subject: user.id });
	return { token, expiresIn: String(expiresIn) };
}

export function signRefreshToken(user: UserTokenSubject): { token: string; expiresIn: string } {
	const { secret, expiresIn } = getRefreshConfig();
	const payload: Partial<AuthTokenPayload> = {
		userId: user.id,
		email: user.email,
		role: user.role,
	};
	const token = jwt.sign(payload, secret, { ...baseSignOptions(expiresIn), subject: user.id });
	return { token, expiresIn: String(expiresIn) };
}

export function verifyAccessToken(token: string): AuthTokenPayload {
	const { secret } = getAccessConfig();
	const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
	return decoded as AuthTokenPayload;
}

export function verifyRefreshToken(token: string): AuthTokenPayload {
	const { secret } = getRefreshConfig();
	const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
	return decoded as AuthTokenPayload;
}

function getPasswordResetConfig() {
	const secret = requireEnv('JWT_PASSWORD_RESET_SECRET') || requireEnv('JWT_ACCESS_SECRET');
	const expiresRaw = process.env.PASSWORD_RESET_TOKEN_EXPIRY || '1h';
	const expiresIn = expiresRaw as ExpiresIn;
	return { secret, expiresIn } as const;
}

export function signPasswordResetToken(user: UserTokenSubject): { token: string; expiresIn: string } {
	const { secret, expiresIn } = getPasswordResetConfig();
	const payload: Partial<AuthTokenPayload> = {
		userId: user.id,
		email: user.email,
		role: user.role,
	};
	const token = jwt.sign(payload, secret, { ...baseSignOptions(expiresIn), subject: user.id });
	return { token, expiresIn: String(expiresIn) };
}

export function verifyPasswordResetToken(token: string): AuthTokenPayload {
	const { secret } = getPasswordResetConfig();
	const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
	return decoded as AuthTokenPayload;
}


