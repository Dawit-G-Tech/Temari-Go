import { Request, Response } from 'express';
import { BusService } from '../services/bus.service';

/**
 * Create a new bus
 * POST /api/buses
 * Admin only
 */
export const createBus = async (req: Request, res: Response) => {
	try {
		const { bus_number, capacity, driver_id } = req.body;

		const bus = await BusService.createBus({
			bus_number,
			capacity: capacity !== undefined ? Number(capacity) : undefined,
			driver_id: driver_id !== undefined ? driver_id : undefined,
		});

		return res.status(201).json({
			success: true,
			data: bus,
			message: 'Bus created successfully.',
		});
	} catch (error: any) {
		console.error('Create bus error:', error);

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
			message: 'An error occurred while creating the bus.',
		});
	}
};

/**
 * Get all buses with driver info and routes
 * GET /api/buses
 * Admin only
 */
export const getAllBuses = async (req: Request, res: Response) => {
	try {
		const buses = await BusService.getAllBuses();

		return res.status(200).json({
			success: true,
			data: buses,
		});
	} catch (error: any) {
		console.error('Get buses error:', error);

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
			message: 'An error occurred while fetching buses.',
		});
	}
};

/**
 * Get bus by ID with driver, routes, current location, onboard students
 * GET /api/buses/:id
 * Admin only
 */
export const getBusById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		const bus = await BusService.getBusById(Number(id));

		return res.status(200).json({
			success: true,
			data: bus,
		});
	} catch (error: any) {
		console.error('Get bus error:', error);

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
			message: 'An error occurred while fetching the bus.',
		});
	}
};

/**
 * Update bus
 * PUT /api/buses/:id
 * Admin only
 */
export const updateBus = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { bus_number, capacity, driver_id } = req.body;

		const updateData: any = {};
		if (bus_number !== undefined) updateData.bus_number = bus_number;
		if (capacity !== undefined) updateData.capacity = Number(capacity);
		if (driver_id !== undefined) updateData.driver_id = driver_id;

		const bus = await BusService.updateBus(Number(id), updateData);

		return res.status(200).json({
			success: true,
			data: bus,
			message: 'Bus updated successfully.',
		});
	} catch (error: any) {
		console.error('Update bus error:', error);

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
			message: 'An error occurred while updating the bus.',
		});
	}
};

/**
 * Delete bus (hard delete)
 * DELETE /api/buses/:id
 * Admin only
 */
export const deleteBus = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		await BusService.deleteBus(Number(id));

		return res.status(200).json({
			success: true,
			message: 'Bus deleted successfully.',
		});
	} catch (error: any) {
		console.error('Delete bus error:', error);

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
			message: 'An error occurred while deleting the bus.',
		});
	}
};

/**
 * Assign driver to bus (validate driver role, clear previous bus assignment)
 * PUT /api/buses/:id/assign-driver
 * Admin only
 */
export const assignDriver = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { driver_id } = req.body;

		if (driver_id == null || String(driver_id).trim() === '') {
			return res.status(400).json({
				success: false,
				code: 'MISSING_DRIVER_ID',
				message: 'driver_id is required.',
			});
		}

		const bus = await BusService.assignDriver(Number(id), Number(driver_id));

		return res.status(200).json({
			success: true,
			data: bus,
			message: 'Driver assigned to bus successfully.',
		});
	} catch (error: any) {
		console.error('Assign driver error:', error);

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
			message: 'An error occurred while assigning the driver.',
		});
	}
};
