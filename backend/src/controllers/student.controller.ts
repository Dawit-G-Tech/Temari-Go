import { Request, Response, NextFunction } from 'express';
import { db } from '../../models';

const { Student, User, RFIDCard, Attendance, Payment, RouteAssignment, Route } = db;

/**
 * Helper: check if current user is admin
 */
function isAdmin(req: Request): boolean {
	return !!req.user && req.user.role === 'admin';
}

/**
 * Helper: check if current user is parent
 */
function isParent(req: Request): boolean {
	return !!req.user && req.user.role === 'parent';
}

/**
 * Create new student
 * POST /api/students
 * - Admin only: can create a student for any existing parent (must specify parent_id).
 * - Parents cannot create students (even their own).
 */
export const createStudent = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.user) {
			return next({ status: 401, code: 'UNAUTHORIZED', message: 'Access denied.' });
		}

		if (!isAdmin(req)) {
			return res.status(403).json({
				success: false,
				code: 'FORBIDDEN',
				message: 'Only admins can create students.',
			});
		}

		const { full_name, grade, parent_id, home_latitude, home_longitude } = req.body;

		if (!full_name || typeof full_name !== 'string') {
			return res.status(400).json({
				success: false,
				code: 'INVALID_FULL_NAME',
				message: 'full_name is required and must be a string.',
			});
		}

		if (parent_id === undefined || parent_id === null) {
			return res.status(400).json({
				success: false,
				code: 'PARENT_ID_REQUIRED',
				message: 'parent_id is required when creating a student.',
			});
		}

		const finalParentId = Number(parent_id);
		if (Number.isNaN(finalParentId)) {
			return res.status(400).json({
				success: false,
				code: 'INVALID_PARENT_ID',
				message: 'parent_id must be a valid number.',
			});
		}

		// Ensure parent exists
		const parent = await User.findByPk(finalParentId);
		if (!parent) {
			return res.status(400).json({
				success: false,
				code: 'PARENT_NOT_FOUND',
				message: 'Parent user not found.',
			});
		}

		const student = await Student.create({
			full_name,
			grade: grade ?? null,
			parent_id: finalParentId,
			home_latitude: home_latitude ?? null,
			home_longitude: home_longitude ?? null,
		});

		return res.status(201).json({
			success: true,
			data: student,
		});
	} catch (error: any) {
		console.error('Create student error:', error);
		return next(error);
	}
};

/**
 * Get all students
 * GET /api/students
 * - Admin: can view all students, with filters
 * - Parent: can only view their own students
 * Query params:
 * - parentId: filter by parent_id (admin only)
 * - grade: filter by grade
 * - busId: filter by bus_id (via route assignments)
 */
export const getAllStudents = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.user) {
			return next({ status: 401, code: 'UNAUTHORIZED', message: 'Access denied.' });
		}

		const role = req.user.role;
		const where: any = {};
		const include: any[] = [];

		// Role-based access
		if (isParent(req)) {
			// Parent can only see their own students
			where.parent_id = Number(req.user.id);
		} else if (isAdmin(req)) {
			// Admin can optionally filter by parentId
			if (req.query.parentId) {
				const parentId = Number(req.query.parentId);
				if (!Number.isNaN(parentId)) {
					where.parent_id = parentId;
				}
			}
		} else {
			return res.status(403).json({
				success: false,
				code: 'FORBIDDEN',
				message: 'Only admins and parents can view students.',
			});
		}

		// Filter by grade
		if (req.query.grade && typeof req.query.grade === 'string') {
			where.grade = req.query.grade;
		}

		// Filter by bus_id via route assignments
		if (req.query.busId) {
			const busId = Number(req.query.busId);
			if (!Number.isNaN(busId)) {
				include.push({
					model: RouteAssignment,
					required: true,
					include: [
						{
							model: Route,
							where: { bus_id: busId },
							attributes: [],
						},
					],
					attributes: [],
				});
			}
		}

		const students = await Student.findAll({
			where,
			attributes: ['id', 'full_name', 'grade', 'parent_id', 'home_latitude', 'home_longitude'],
			include,
			order: [['full_name', 'ASC']],
		});

		return res.status(200).json({
			success: true,
			data: students,
		});
	} catch (error: any) {
		console.error('Get students error:', error);
		return next(error);
	}
};

/**
 * Get student details
 * GET /api/students/:id
 * - Includes RFID cards, latest attendance summary, latest payment status
 * - Admin: can view any student
 * - Parent: can only view their own students
 */
export const getStudentById = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.user) {
			return next({ status: 401, code: 'UNAUTHORIZED', message: 'Access denied.' });
		}

		const studentId = Number(req.params.id);
		if (Number.isNaN(studentId)) {
			return res.status(400).json({
				success: false,
				code: 'INVALID_STUDENT_ID',
				message: 'Invalid student ID.',
			});
		}

		const student = await Student.findByPk(studentId, {
			include: [
				{
					model: RFIDCard,
					attributes: ['id', 'rfid_tag', 'active'],
				},
				{
					model: Payment,
					attributes: ['id', 'amount', 'status', 'timestamp'],
				},
			],
		});

		if (!student) {
			return res.status(404).json({
				success: false,
				code: 'STUDENT_NOT_FOUND',
				message: 'Student not found.',
			});
		}

		// Role-based access: parent can only access their own student
		if (isParent(req) && student.parent_id !== Number(req.user.id)) {
			return res.status(403).json({
				success: false,
				code: 'FORBIDDEN',
				message: 'You can only view your own students.',
			});
		}

		// Attendance summary
		const totalAttendance = await Attendance.count({
			where: { student_id: studentId },
		});

		const lastAttendance = await Attendance.findOne({
			where: { student_id: studentId },
			order: [['timestamp', 'DESC']],
		});

		// Latest payment status
		const latestPayment = await Payment.findOne({
			where: { student_id: studentId },
			order: [['timestamp', 'DESC']],
		});

		return res.status(200).json({
			success: true,
			data: {
				student,
				attendanceSummary: {
					totalRecords: totalAttendance,
					lastAttendance,
				},
				latestPaymentStatus: latestPayment
					? {
							status: latestPayment.status,
							amount: latestPayment.amount,
							timestamp: latestPayment.timestamp,
					  }
					: null,
			},
		});
	} catch (error: any) {
		console.error('Get student error:', error);
		return next(error);
	}
};

/**
 * Update student
 * PUT /api/students/:id
 * - Admin only: can update any student (including parent_id and home coordinates).
 * - Parents cannot update students (even their own).
 */
export const updateStudent = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.user) {
			return next({ status: 401, code: 'UNAUTHORIZED', message: 'Access denied.' });
		}

		if (!isAdmin(req)) {
			return res.status(403).json({
				success: false,
				code: 'FORBIDDEN',
				message: 'Only admins can update students.',
			});
		}

		const studentId = Number(req.params.id);
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

		const { full_name, grade, parent_id, home_latitude, home_longitude } = req.body;

		// Build update payload
		const updateData: any = {};
		if (full_name !== undefined) updateData.full_name = full_name;
		if (grade !== undefined) updateData.grade = grade;
		if (home_latitude !== undefined) updateData.home_latitude = home_latitude;
		if (home_longitude !== undefined) updateData.home_longitude = home_longitude;

		if (parent_id !== undefined) {
			const newParentId = Number(parent_id);
			if (Number.isNaN(newParentId)) {
				return res.status(400).json({
					success: false,
					code: 'INVALID_PARENT_ID',
					message: 'parent_id must be a valid number.',
				});
			}

			const parent = await User.findByPk(newParentId);
			if (!parent) {
				return res.status(400).json({
					success: false,
					code: 'PARENT_NOT_FOUND',
					message: 'Parent user not found.',
				});
			}
			updateData.parent_id = newParentId;
		}

		await student.update(updateData);

		return res.status(200).json({
			success: true,
			data: student,
		});
	} catch (error: any) {
		console.error('Update student error:', error);
		return next(error);
	}
};

/**
 * Delete student
 * DELETE /api/students/:id
 * - Admin only: can delete any student.
 * - Parents cannot delete students (even their own).
 * Note: This is a hard delete. For true soft delete, add a deleted_at column and filter it out.
 */
export const deleteStudent = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.user) {
			return next({ status: 401, code: 'UNAUTHORIZED', message: 'Access denied.' });
		}

		if (!isAdmin(req)) {
			return res.status(403).json({
				success: false,
				code: 'FORBIDDEN',
				message: 'Only admins can delete students.',
			});
		}

		const studentId = Number(req.params.id);
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

		await student.destroy();

		return res.status(200).json({
			success: true,
			message: 'Student deleted successfully.',
		});
	} catch (error: any) {
		console.error('Delete student error:', error);
		return next(error);
	}
};


