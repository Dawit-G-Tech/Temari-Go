import { Request, Response } from 'express';
import { db } from '../../models';
const { Student } = db;

/**
 * Get all students
 * GET /api/students
 */
export const getAllStudents = async (req: Request, res: Response) => {
	try {
		const students = await Student.findAll({
			attributes: ['id', 'full_name', 'grade', 'parent_id'],
			order: [['full_name', 'ASC']],
		});

		return res.status(200).json({
			success: true,
			data: students,
		});
	} catch (error: any) {
		console.error('Get students error:', error);
		return res.status(500).json({
			success: false,
			code: 'INTERNAL_ERROR',
			message: 'An error occurred while fetching students.',
		});
	}
};

