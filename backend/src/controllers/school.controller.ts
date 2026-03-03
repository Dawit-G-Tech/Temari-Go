import { Request, Response } from 'express';
import { SchoolService } from '../services/school.service';

/**
 * Create a new school
 * POST /api/schools
 * Admin only
 */
export const createSchool = async (req: Request, res: Response) => {
	try {
		const { name, address, latitude, longitude } = req.body;

		const school = await SchoolService.createSchool({
			name,
			address: address ?? null,
			latitude: latitude ?? null,
			longitude: longitude ?? null,
		});

		return res.status(201).json({
			success: true,
			data: school,
			message: 'School created successfully.',
		});
	} catch (error: any) {
		if (error.status && error.code) {
			return res.status(error.status).json({
				success: false,
				code: error.code,
				message: error.message,
			});
		}
		return res.status(500).json({
			success: false,
			code: 'INTERNAL_ERROR',
			message: error.message || 'An error occurred while creating the school.',
		});
	}
};

/**
 * Get all schools
 * GET /api/schools
 * Admin only
 */
export const getAllSchools = async (req: Request, res: Response) => {
	try {
		const schools = await SchoolService.getAllSchools();
		return res.status(200).json({
			success: true,
			data: schools,
		});
	} catch (error: any) {
		if (error.status && error.code) {
			return res.status(error.status).json({
				success: false,
				code: error.code,
				message: error.message,
			});
		}
		return res.status(500).json({
			success: false,
			code: 'INTERNAL_ERROR',
			message: 'An error occurred while fetching schools.',
		});
	}
};

/**
 * Get school by ID
 * GET /api/schools/:id
 * Admin only
 */
export const getSchoolById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const school = await SchoolService.getSchoolById(Number(id));
		return res.status(200).json({
			success: true,
			data: school,
		});
	} catch (error: any) {
		if (error.status && error.code) {
			return res.status(error.status).json({
				success: false,
				code: error.code,
				message: error.message,
			});
		}
		return res.status(500).json({
			success: false,
			code: 'INTERNAL_ERROR',
			message: 'An error occurred while fetching the school.',
		});
	}
};

/**
 * Update school
 * PUT /api/schools/:id
 * Admin only
 */
export const updateSchool = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { name, address, latitude, longitude } = req.body;

		const updateData: any = {};
		if (name !== undefined) updateData.name = name;
		if (address !== undefined) updateData.address = address;
		if (latitude !== undefined) updateData.latitude = latitude;
		if (longitude !== undefined) updateData.longitude = longitude;

		const school = await SchoolService.updateSchool(Number(id), updateData);
		return res.status(200).json({
			success: true,
			data: school,
			message: 'School updated successfully.',
		});
	} catch (error: any) {
		if (error.status && error.code) {
			return res.status(error.status).json({
				success: false,
				code: error.code,
				message: error.message,
			});
		}
		return res.status(500).json({
			success: false,
			code: 'INTERNAL_ERROR',
			message: 'An error occurred while updating the school.',
		});
	}
};

/**
 * Delete school
 * DELETE /api/schools/:id
 * Admin only
 */
export const deleteSchool = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		await SchoolService.deleteSchool(Number(id));
		return res.status(200).json({
			success: true,
			message: 'School deleted successfully.',
		});
	} catch (error: any) {
		if (error.status && error.code) {
			return res.status(error.status).json({
				success: false,
				code: error.code,
				message: error.message,
			});
		}
		return res.status(500).json({
			success: false,
			code: 'INTERNAL_ERROR',
			message: 'An error occurred while deleting the school.',
		});
	}
};
