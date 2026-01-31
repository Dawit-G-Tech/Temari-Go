import { Request, Response } from 'express';
import { RouteAssignmentService } from '../services/routeAssignment.service';

/**
 * Assign student to route (set pickup coordinates, validate not already assigned).
 * POST /api/route-assignments
 * Admin only
 */
export const createRouteAssignment = async (req: Request, res: Response) => {
	try {
		const { route_id, student_id, pickup_latitude, pickup_longitude } = req.body;

		const assignment = await RouteAssignmentService.createRouteAssignment({
			route_id,
			student_id,
			pickup_latitude,
			pickup_longitude,
		});

		return res.status(201).json({
			success: true,
			data: assignment,
			message: 'Student assigned to route successfully.',
		});
	} catch (error: any) {
		console.error('Create route assignment error:', error);

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
			message: 'An error occurred while assigning the student to the route.',
		});
	}
};

/**
 * Get all students assigned to a route (include pickup locations).
 * GET /api/route-assignments/route/:routeId
 * Admin only
 */
export const getAssignmentsByRouteId = async (req: Request, res: Response) => {
	try {
		const { routeId } = req.params;

		const assignments = await RouteAssignmentService.getAssignmentsByRouteId(
			Number(routeId)
		);

		return res.status(200).json({
			success: true,
			data: assignments,
		});
	} catch (error: any) {
		console.error('Get route assignments error:', error);

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
			message: 'An error occurred while fetching route assignments.',
		});
	}
};

/**
 * Remove student from route.
 * DELETE /api/route-assignments/:id
 * Admin only
 */
export const deleteRouteAssignment = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		await RouteAssignmentService.deleteRouteAssignment(Number(id));

		return res.status(200).json({
			success: true,
			message: 'Student removed from route successfully.',
		});
	} catch (error: any) {
		console.error('Delete route assignment error:', error);

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
			message: 'An error occurred while removing the student from the route.',
		});
	}
};
