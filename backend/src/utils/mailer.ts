import nodemailer, { Transporter } from 'nodemailer';

type SendMailParams = {
	to: string;
	subject: string;
	text?: string;
	html?: string;
};

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
	if (transporter) return transporter;
	const host = process.env.SMTP_HOST;
	const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;

	if (!host || !user || !pass) {
		throw new Error('SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER, SMTP_PASS');
	}

	transporter = nodemailer.createTransport({
		host,
		port,
		secure: port === 465,
		auth: { user, pass },
	});
	return transporter;
}

export async function sendMail(params: SendMailParams): Promise<void> {
	const mailFrom = process.env.MAIL_FROM || 'no-reply@example.com';
	const tx = getTransporter();
	await tx.sendMail({
		from: mailFrom,
		to: params.to,
		subject: params.subject,
		text: params.text,
		html: params.html,
	});
}

export async function sendPasswordResetEmail({ to, resetUrl }: { to: string; resetUrl: string }): Promise<void> {
	const subject = 'Reset your password';
	const html = `
		<p>You requested to reset your password.</p>
		<p>Click the link below to set a new password:</p>
		<p><a href="${resetUrl}">Reset Password</a></p>
		<p>If you did not request this, please ignore this email.</p>
	`;
	await sendMail({ to, subject, html });
}


