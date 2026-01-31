import { Request, Response } from 'express';
import { LocationService } from '../services/location.service';

/**
 * Create location update from microcontroller
 * POST /api/locations
 */
export const createLocation = async (req: Request, res: Response) => {
	try {
		const { bus_id, latitude, longitude, speed, timestamp } = req.body;

		// Validate required fields
		if (!bus_id) {
			return res.status(400).json({
				success: false,
				code: 'MISSING_BUS_ID',
				message: 'bus_id is required.',
			});
		}

		if (latitude === undefined || longitude === undefined) {
			return res.status(400).json({
				success: false,
				code: 'MISSING_COORDINATES',
				message: 'latitude and longitude are required.',
			});
		}

		// Validate coordinate ranges
		if (latitude < -90 || latitude > 90) {
			return res.status(400).json({
				success: false,
				code: 'INVALID_LATITUDE',
				message: 'Latitude must be between -90 and 90.',
			});
		}

		if (longitude < -180 || longitude > 180) {
			return res.status(400).json({
				success: false,
				code: 'INVALID_LONGITUDE',
				message: 'Longitude must be between -180 and 180.',
			});
		}

		// Process the location update
		const result = await LocationService.createLocationUpdate({
			bus_id: Number(bus_id),
			latitude: Number(latitude),
			longitude: Number(longitude),
			speed: speed !== undefined && speed !== null ? Number(speed) : undefined,
			timestamp: timestamp ? new Date(timestamp) : undefined,
		});

		return res.status(201).json({
			success: true,
			data: result,
			message: result.speedViolation?.detected
				? result.speedViolation.message
				: 'Location update recorded successfully.',
		});
	} catch (error: any) {
		console.error('Location update error:', error);

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
			message: 'An error occurred while processing the location update.',
		});
	}
};

/**
 * Get current (latest) location for a bus
 * GET /api/locations/bus/:busId/current
 */
export const getCurrentBusLocation = async (req: Request, res: Response) => {
	try {
		const { busId } = req.params;

		const location = await LocationService.getCurrentBusLocation(Number(busId));

		if (!location) {
			return res.status(404).json({
				success: false,
				code: 'LOCATION_NOT_FOUND',
				message: 'No location data found for this bus.',
			});
		}

		return res.status(200).json({
			success: true,
			data: location,
		});
	} catch (error: any) {
		console.error('Get current bus location error:', error);
		return res.status(500).json({
			success: false,
			code: 'INTERNAL_ERROR',
			message: 'An error occurred while fetching current location.',
		});
	}
};

/**
 * Get location history for a bus
 * GET /api/locations/bus/:busId/history
 */
export const getBusLocationHistory = async (req: Request, res: Response) => {
	try {
		const { busId } = req.params;
		const { startDate, endDate, limit } = req.query;

		const start = startDate ? new Date(startDate as string) : undefined;
		const end = endDate ? new Date(endDate as string) : undefined;
		const limitNum = limit ? Number(limit) : undefined;

		const locations = await LocationService.getBusLocations(
			Number(busId),
			start,
			end,
			limitNum
		);

		return res.status(200).json({
			success: true,
			data: locations,
		});
	} catch (error: any) {
		console.error('Get bus locations history error:', error);
		return res.status(500).json({
			success: false,
			code: 'INTERNAL_ERROR',
			message: 'An error occurred while fetching locations.',
		});
	}
};
