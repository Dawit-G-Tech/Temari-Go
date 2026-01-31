import { Request, Response } from 'express';
import { db } from '../../models';
const { Bus } = db;

/**
 * Get all buses
 * GET /api/buses
 */
export const getAllBuses = async (req: Request, res: Response) => {
	try {
		const buses = await Bus.findAll({
			attributes: ['id', 'bus_number', 'capacity', 'driver_id'],
			order: [['bus_number', 'ASC']],
		});

		return res.status(200).json({
			success: true,
			data: buses,
		});
	} catch (error: any) {
		console.error('Get buses error:', error);
		return res.status(500).json({
			success: false,
			code: 'INTERNAL_ERROR',
			message: 'An error occurred while fetching buses.',
		});
	}
};

