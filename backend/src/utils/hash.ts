import bcrypt from 'bcrypt';

function getSaltRounds(): number {
	const raw = process.env.BCRYPT_SALT_ROUNDS;
	if (!raw) return 12;
	const parsed = Number(raw);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 12;
}

export async function hashPassword(password: string): Promise<string> {
	const saltRounds = getSaltRounds();
	return await bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
	return await bcrypt.compare(password, hash);
}


