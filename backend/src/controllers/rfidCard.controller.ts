import { Request, Response, NextFunction } from 'express';
import { db } from '../../models';

const { RFIDCard, Student } = db;

function isAdmin(req: Request): boolean {
	return !!req.user && req.user.role === 'admin';
}

function isParent(req: Request): boolean {
	return !!req.user && req.user.role === 'parent';
}

/**
 * Assign RFID card to student
 * POST /api/rfid-cards/assign
 * - Admin only
 * - Body: { rfid_tag: string, student_id: number }
 * - Validates RFID tag is unique (no other active card with same tag)
 * - If tag exists but card is inactive, re-assigns and activates
 */
export const assignRfidCard = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.user) {
			return next({ status: 401, code: 'UNAUTHORIZED', message: 'Access denied.' });
		}
		if (!isAdmin(req)) {
			return res.status(403).json({
				success: false,
				code: 'FORBIDDEN',
				message: 'Only admins can assign RFID cards.',
			});
		}

		const { rfid_tag, student_id } = req.body;

		if (!rfid_tag || typeof rfid_tag !== 'string') {
			return res.status(400).json({
				success: false,
				code: 'INVALID_RFID_TAG',
				message: 'rfid_tag is required and must be a string.',
			});
		}

		const tagTrimmed = rfid_tag.trim();
		if (!tagTrimmed) {
			return res.status(400).json({
				success: false,
				code: 'INVALID_RFID_TAG',
				message: 'rfid_tag cannot be empty.',
			});
		}

		const studentId = Number(student_id);
		if (student_id === undefined || student_id === null || Number.isNaN(studentId)) {
			return res.status(400).json({
				success: false,
				code: 'INVALID_STUDENT_ID',
				message: 'student_id is required and must be a valid number.',
			});
		}

		const student = await Student.findByPk(studentId);
		if (!student) {
			return res.status(404).json({
				success: false,
				code: 'STUDENT_NOT_FOUND',
				message: 'Student not found.',
			});
		}

		const existing = await RFIDCard.findOne({ where: { rfid_tag: tagTrimmed } });

		if (existing) {
			if (existing.active) {
				return res.status(409).json({
					success: false,
					code: 'RFID_TAG_IN_USE',
					message: 'This RFID tag is already assigned to an active card.',
				});
			}
			// Re-use inactive card: assign to new student and activate
			await existing.update({
				student_id: studentId,
				active: true,
				issued_at: new Date(),
			});
			return res.status(200).json({
				success: true,
				data: existing,
			});
		}

		const card = await RFIDCard.create({
			rfid_tag: tagTrimmed,
			student_id: studentId,
			active: true,
		});

		return res.status(201).json({
			success: true,
			data: card,
		});
	} catch (error: unknown) {
		console.error('Assign RFID card error:', error);
		return next(error);
	}
};

/**
 * Get active RFID card for student
 * GET /api/rfid-cards/student/:studentId
 * - Admin: any student. Parent: only their own students.
 */
export const getActiveRfidCardByStudent = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.user) {
			return next({ status: 401, code: 'UNAUTHORIZED', message: 'Access denied.' });
		}

		const studentId = Number(req.params.studentId);
		if (Number.isNaN(studentId)) {
			return res.status(400).json({
				success: false,
				code: 'INVALID_STUDENT_ID',
				message: 'Invalid student ID.',
			});
		}

		const student = await Student.findByPk(studentId);
		if (!student) {
			return res.status(404).json({
				success: false,
				code: 'STUDENT_NOT_FOUND',
				message: 'Student not found.',
			});
		}

		if (isParent(req) && student.parent_id !== Number(req.user.id)) {
			return res.status(403).json({
				success: false,
				code: 'FORBIDDEN',
				message: 'You can only view RFID cards for your own students.',
			});
		}

		const card = await RFIDCard.findOne({
			where: { student_id: studentId, active: true },
		});

		return res.status(200).json({
			success: true,
			data: card,
		});
	} catch (error: unknown) {
		console.error('Get RFID card by student error:', error);
		return next(error);
	}
};

/**
 * Deactivate RFID card (e.g. lost/stolen)
 * PUT /api/rfid-cards/:id/deactivate
 * - Admin: any card. Parent: only cards for their own students.
 */
export const deactivateRfidCard = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.user) {
			return next({ status: 401, code: 'UNAUTHORIZED', message: 'Access denied.' });
		}

		const id = Number(req.params.id);
		if (Number.isNaN(id)) {
			return res.status(400).json({
				success: false,
				code: 'INVALID_CARD_ID',
				message: 'Invalid card ID.',
			});
		}

		const card = await RFIDCard.findByPk(id, {
			include: [{ model: Student, attributes: ['id', 'parent_id'] }],
		});

		if (!card) {
			return res.status(404).json({
				success: false,
				code: 'RFID_CARD_NOT_FOUND',
				message: 'RFID card not found.',
			});
		}

		if (isParent(req) && card.student.parent_id !== Number(req.user.id)) {
			return res.status(403).json({
				success: false,
				code: 'FORBIDDEN',
				message: 'You can only deactivate RFID cards for your own students.',
			});
		}

		if (!card.active) {
			return res.status(400).json({
				success: false,
				code: 'CARD_ALREADY_INACTIVE',
				message: 'This card is already deactivated.',
			});
		}

		await card.update({ active: false });

		return res.status(200).json({
			success: true,
			data: card,
		});
	} catch (error: unknown) {
		console.error('Deactivate RFID card error:', error);
		return next(error);
	}
};
