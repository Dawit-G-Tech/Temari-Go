import { Request, Response } from 'express';
import { RouteService } from '../services/route.service';

/**
 * Create a new route (link to bus, set start/end times)
 * POST /api/routes
 * Admin only
 */
export const createRoute = async (req: Request, res: Response) => {
	try {
		const { bus_id, name, start_time, end_time } = req.body;

		const route = await RouteService.createRoute({
			bus_id,
			name,
			start_time,
			end_time,
		});

		return res.status(201).json({
			success: true,
			data: route,
			message: 'Route created successfully.',
		});
	} catch (error: any) {
		console.error('Create route error:', error);

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
			message: 'An error occurred while creating the route.',
		});
	}
};

/**
 * List all routes, optionally filter by bus_id
 * GET /api/routes
 * Admin only
 */
export const getAllRoutes = async (req: Request, res: Response) => {
	try {
		const bus_id = req.query.bus_id;

		const filters =
			bus_id !== undefined && bus_id !== ''
				? { bus_id: Number(bus_id) }
				: undefined;

		const routes = await RouteService.getAllRoutes(filters);

		return res.status(200).json({
			success: true,
			data: routes,
		});
	} catch (error: any) {
		console.error('Get routes error:', error);

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
			message: 'An error occurred while fetching routes.',
		});
	}
};

/**
 * Get route by ID with assigned students and pickup points
 * GET /api/routes/:id
 * Admin only
 */
export const getRouteById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		const route = await RouteService.getRouteById(Number(id));

		return res.status(200).json({
			success: true,
			data: route,
		});
	} catch (error: any) {
		console.error('Get route error:', error);

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
			message: 'An error occurred while fetching the route.',
		});
	}
};

/**
 * Update route information
 * PUT /api/routes/:id
 * Admin only
 */
export const updateRoute = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { bus_id, name, start_time, end_time } = req.body;

		const updateData: any = {};
		if (bus_id !== undefined) updateData.bus_id = bus_id;
		if (name !== undefined) updateData.name = name;
		if (start_time !== undefined) updateData.start_time = start_time;
		if (end_time !== undefined) updateData.end_time = end_time;

		const route = await RouteService.updateRoute(Number(id), updateData);

		return res.status(200).json({
			success: true,
			data: route,
			message: 'Route updated successfully.',
		});
	} catch (error: any) {
		console.error('Update route error:', error);

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
			message: 'An error occurred while updating the route.',
		});
	}
};

/**
 * Delete route
 * DELETE /api/routes/:id
 * Admin only
 */
export const deleteRoute = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		await RouteService.deleteRoute(Number(id));

		return res.status(200).json({
			success: true,
			message: 'Route deleted successfully.',
		});
	} catch (error: any) {
		console.error('Delete route error:', error);

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
			message: 'An error occurred while deleting the route.',
		});
	}
};

/**
 * Optimize route: group students by pickup zones, minimize stops and travel time,
 * update pickup order, return optimized route with waypoints.
 * POST /api/routes/:id/optimize
 * Admin only
 */
export const optimizeRoute = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { zone_radius_km } = req.body;

		const options =
			zone_radius_km != null && !Number.isNaN(Number(zone_radius_km))
				? { zoneRadiusKm: Number(zone_radius_km) }
				: undefined;

		const result = await RouteService.optimizeRoute(Number(id), options ?? {});

		return res.status(200).json({
			success: true,
			data: result,
			message: 'Route optimized successfully.',
		});
	} catch (error: any) {
		console.error('Optimize route error:', error);

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
			message: 'An error occurred while optimizing the route.',
		});
	}
};

/**
 * Get realistic driving directions for a route (polyline, duration, ETAs) via Google Directions API.
 * Uses the route's ordered waypoints (optimize first for best order). Optional origin/destination via query.
 * GET /api/routes/:id/directions
 * Admin only
 */
export const getRouteDirections = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const originLat = req.query.origin_lat;
		const originLng = req.query.origin_lng;
		const destLat = req.query.destination_lat;
		const destLng = req.query.destination_lng;

		const options: { origin?: { lat: number; lng: number }; destination?: { lat: number; lng: number } } = {};
		if (
			originLat != null &&
			originLng != null &&
			!Number.isNaN(Number(originLat)) &&
			!Number.isNaN(Number(originLng))
		) {
			options.origin = { lat: Number(originLat), lng: Number(originLng) };
		}
		if (
			destLat != null &&
			destLng != null &&
			!Number.isNaN(Number(destLat)) &&
			!Number.isNaN(Number(destLng))
		) {
			options.destination = { lat: Number(destLat), lng: Number(destLng) };
		}

		const result = await RouteService.getRouteDirections(Number(id), options);

		return res.status(200).json({
			success: true,
			data: result,
			message: result.directions
				? 'Directions retrieved successfully.'
				: 'Route waypoints returned. Set GOOGLE_MAPS_API_KEY for polyline and ETAs.',
		});
	} catch (error: any) {
		console.error('Get route directions error:', error);

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
			message: 'An error occurred while fetching route directions.',
		});
	}
};
