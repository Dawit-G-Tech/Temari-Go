import { Request, Response } from 'express';
import { GeofenceService, GeofenceFilters } from '../services/geofence.service';

/**
 * Create a new geofence
 * POST /api/geofences
 * Admin only
 */
export const createGeofence = async (req: Request, res: Response) => {
	try {
		const { name, type, latitude, longitude, radius_meters, student_id, bus_id } = req.body;

		// Validate required fields
		if (!name) {
			return res.status(400).json({
				success: false,
				code: 'MISSING_NAME',
				message: 'Name is required.',
			});
		}

		if (!type) {
			return res.status(400).json({
				success: false,
				code: 'MISSING_TYPE',
				message: 'Type is required.',
			});
		}

		if (latitude === undefined || longitude === undefined) {
			return res.status(400).json({
				success: false,
				code: 'MISSING_COORDINATES',
				message: 'Latitude and longitude are required.',
			});
		}

		const geofence = await GeofenceService.createGeofence({
			name,
			type,
			latitude: Number(latitude),
			longitude: Number(longitude),
			radius_meters: radius_meters !== undefined ? Number(radius_meters) : undefined,
			student_id: student_id !== undefined ? Number(student_id) : undefined,
			bus_id: bus_id !== undefined ? Number(bus_id) : undefined,
		});

		return res.status(201).json({
			success: true,
			data: geofence,
			message: 'Geofence created successfully.',
		});
	} catch (error: any) {
		console.error('Create geofence error:', error);

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
			message: 'An error occurred while creating the geofence.',
		});
	}
};

/**
 * Get all geofences with optional filters
 * GET /api/geofences
 * Admin/Driver access
 */
export const getAllGeofences = async (req: Request, res: Response) => {
	try {
		const { type, bus_id, student_id } = req.query;

		const filters: GeofenceFilters = {};

		if (type && (type === 'school' || type === 'home')) {
			filters.type = type;
		}

		if (bus_id !== undefined) {
			filters.bus_id = Number(bus_id);
		}

		if (student_id !== undefined) {
			filters.student_id = Number(student_id);
		}

		const geofences = await GeofenceService.getAllGeofences(filters);

		return res.status(200).json({
			success: true,
			data: geofences,
		});
	} catch (error: any) {
		console.error('Get geofences error:', error);

		return res.status(500).json({
			success: false,
			code: 'INTERNAL_ERROR',
			message: 'An error occurred while fetching geofences.',
		});
	}
};

/**
 * Get a specific geofence by ID
 * GET /api/geofences/:id
 */
export const getGeofenceById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		const geofence = await GeofenceService.getGeofenceById(Number(id));

		return res.status(200).json({
			success: true,
			data: geofence,
		});
	} catch (error: any) {
		console.error('Get geofence error:', error);

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
			message: 'An error occurred while fetching the geofence.',
		});
	}
};

/**
 * Update a geofence
 * PUT /api/geofences/:id
 * Admin only
 */
export const updateGeofence = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { name, type, latitude, longitude, radius_meters, student_id, bus_id } = req.body;

		const updateData: any = {};

		if (name !== undefined) updateData.name = name;
		if (type !== undefined) updateData.type = type;
		if (latitude !== undefined) updateData.latitude = Number(latitude);
		if (longitude !== undefined) updateData.longitude = Number(longitude);
		if (radius_meters !== undefined) updateData.radius_meters = Number(radius_meters);
		if (student_id !== undefined) updateData.student_id = student_id === null ? null : Number(student_id);
		if (bus_id !== undefined) updateData.bus_id = bus_id === null ? null : Number(bus_id);

		const geofence = await GeofenceService.updateGeofence(Number(id), updateData);

		return res.status(200).json({
			success: true,
			data: geofence,
			message: 'Geofence updated successfully.',
		});
	} catch (error: any) {
		console.error('Update geofence error:', error);

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
			message: 'An error occurred while updating the geofence.',
		});
	}
};

/**
 * Delete a geofence
 * DELETE /api/geofences/:id
 * Admin only
 */
export const deleteGeofence = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		await GeofenceService.deleteGeofence(Number(id));

		return res.status(200).json({
			success: true,
			message: 'Geofence deleted successfully.',
		});
	} catch (error: any) {
		console.error('Delete geofence error:', error);

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
			message: 'An error occurred while deleting the geofence.',
		});
	}
};
