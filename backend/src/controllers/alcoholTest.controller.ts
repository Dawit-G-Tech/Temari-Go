import { Request, Response } from 'express';
import { AlcoholTestService, AlcoholTestInput } from '../services/alcoholTest.service';

/**
 * Submit alcohol test from microcontroller
 * POST /api/alcohol-tests
 */
export const submitAlcoholTest = async (req: Request, res: Response) => {
	try {
		const { bus_id, vehicle_id, alcohol_level, latitude, longitude, timestamp } = req.body;

		// Validate required fields
		if (alcohol_level === undefined || alcohol_level === null) {
			return res.status(400).json({
				success: false,
				code: 'MISSING_ALCOHOL_LEVEL',
				message: 'alcohol_level is required.',
			});
		}

		if (!bus_id && !vehicle_id) {
			return res.status(400).json({
				success: false,
				code: 'MISSING_BUS_IDENTIFIER',
				message: 'Either bus_id or vehicle_id is required.',
			});
		}

		// Validate alcohol level
		if (typeof alcohol_level !== 'number' || alcohol_level < 0) {
			return res.status(400).json({
				success: false,
				code: 'INVALID_ALCOHOL_LEVEL',
				message: 'Alcohol level must be a non-negative number.',
			});
		}

		// Validate coordinates if provided
		if (latitude !== undefined) {
			if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
				return res.status(400).json({
					success: false,
					code: 'INVALID_LATITUDE',
					message: 'Latitude must be between -90 and 90.',
				});
			}
		}

		if (longitude !== undefined) {
			if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
				return res.status(400).json({
					success: false,
					code: 'INVALID_LONGITUDE',
					message: 'Longitude must be between -180 and 180.',
				});
			}
		}

		// Prepare input
		const input: AlcoholTestInput = {
			bus_id: bus_id ? Number(bus_id) : undefined,
			vehicle_id: vehicle_id as string | undefined,
			alcohol_level: Number(alcohol_level),
			latitude: latitude !== undefined ? Number(latitude) : undefined,
			longitude: longitude !== undefined ? Number(longitude) : undefined,
			timestamp: timestamp ? new Date(timestamp) : undefined,
		};

		// Submit test
		const result = await AlcoholTestService.submitAlcoholTest(input);

		return res.status(200).json({
			success: true,
			data: result,
			message: result.message,
		});
	} catch (error: any) {
		console.error('Alcohol test submission error:', error);

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
			message: 'An error occurred while submitting the alcohol test.',
		});
	}
};

/**
 * Get alcohol test history for a driver
 * GET /api/alcohol-tests/driver/:driverId
 */
export const getDriverAlcoholTests = async (req: Request, res: Response) => {
	try {
		const { driverId } = req.params;
		const { limit } = req.query;

		const tests = await AlcoholTestService.getDriverAlcoholTests(
			Number(driverId),
			limit ? Number(limit) : undefined
		);

		return res.status(200).json({
			success: true,
			data: tests,
			count: tests.length,
		});
	} catch (error: any) {
		console.error('Get driver alcohol tests error:', error);

		return res.status(500).json({
			success: false,
			code: 'INTERNAL_ERROR',
			message: 'An error occurred while fetching alcohol tests.',
		});
	}
};

/**
 * Get alcohol test history for a bus
 * GET /api/alcohol-tests/bus/:busId
 */
export const getBusAlcoholTests = async (req: Request, res: Response) => {
	try {
		const { busId } = req.params;
		const { limit } = req.query;

		const tests = await AlcoholTestService.getBusAlcoholTests(
			Number(busId),
			limit ? Number(limit) : undefined
		);

		return res.status(200).json({
			success: true,
			data: tests,
			count: tests.length,
		});
	} catch (error: any) {
		console.error('Get bus alcohol tests error:', error);

		return res.status(500).json({
			success: false,
			code: 'INTERNAL_ERROR',
			message: 'An error occurred while fetching alcohol tests.',
		});
	}
};
