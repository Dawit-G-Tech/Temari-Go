import { Request, Response } from 'express';
import { AttendanceService, type AttendanceScanInput, type ManualAttendanceInput } from '../services/attendance.service';

/**
 * Process RFID scan from microcontroller
 * POST /api/attendance/scan
 */
export const scanAttendance = async (req: Request, res: Response) => {
	try {
		const {
			rfid_tag,
			timestamp,
			latitude,
			longitude,
			vehicle_id,
			bus_id,
		} = req.body;

		// Validate required fields
		if (!rfid_tag) {
			return res.status(400).json({
				success: false,
				code: 'MISSING_RFID_TAG',
				message: 'rfid_tag is required.',
			});
		}

		if (latitude === undefined || longitude === undefined) {
			return res.status(400).json({
				success: false,
				code: 'MISSING_COORDINATES',
				message: 'latitude and longitude are required.',
			});
		}

		if (!vehicle_id && !bus_id) {
			return res.status(400).json({
				success: false,
				code: 'MISSING_BUS_IDENTIFIER',
				message: 'Either vehicle_id or bus_id is required.',
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

		// Process the scan
		const input: AttendanceScanInput = {
			rfid_tag,
			timestamp: timestamp ? new Date(timestamp) : undefined,
			latitude: Number(latitude),
			longitude: Number(longitude),
			vehicle_id,
			bus_id: bus_id ? Number(bus_id) : undefined,
		};

		const result = await AttendanceService.processScan(input);

		return res.status(200).json({
			success: true,
			data: result,
			message: result.message,
		});
	} catch (error: any) {
		console.error('Attendance scan error:', error);
		
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
			message: 'An error occurred while processing the attendance scan.',
		});
	}
};

/**
 * Sync buffered attendance records from microcontroller
 * POST /api/attendance/sync
 */
export const syncAttendance = async (req: Request, res: Response) => {
	try {
		const { records } = req.body;

		if (!Array.isArray(records) || records.length === 0) {
			return res.status(400).json({
				success: false,
				code: 'MISSING_RECORDS',
				message: 'records array is required and must not be empty.',
			});
		}

		// Basic validation and normalization of each record
		const normalizedRecords = records.map((record: any) => {
			const {
				rfid_tag,
				timestamp,
				latitude,
				longitude,
				vehicle_id,
				bus_id,
				event_id,
			} = record;

			return {
				event_id: event_id ?? null,
				input: {
					rfid_tag,
					timestamp: timestamp ? new Date(timestamp) : undefined,
					latitude: latitude !== undefined ? Number(latitude) : undefined,
					longitude: longitude !== undefined ? Number(longitude) : undefined,
					vehicle_id,
					bus_id: bus_id !== undefined && bus_id !== null ? Number(bus_id) : undefined,
				} as Partial<AttendanceScanInput> & { rfid_tag?: string },
			};
		});

		const result = await AttendanceService.syncBufferedRecords(normalizedRecords);

		return res.status(200).json({
			success: true,
			data: result,
		});
	} catch (error: any) {
		console.error('Attendance sync error:', error);

		return res.status(500).json({
			success: false,
			code: 'INTERNAL_ERROR',
			message: 'An error occurred while syncing attendance records.',
		});
	}
};

/**
 * Manually record attendance by driver
 * POST /api/attendance/manual
 */
export const manualAttendance = async (req: Request, res: Response) => {
	try {
		// Must be authenticated driver
		if (!req.user || req.user.role !== 'driver') {
			return res.status(403).json({
				success: false,
				code: 'FORBIDDEN_ROLE',
				message: 'Only drivers can record manual attendance.',
			});
		}

		const {
			student_id,
			bus_id,
			type,
			timestamp,
			latitude,
			longitude,
		} = req.body;

		if (!student_id || !bus_id) {
			return res.status(400).json({
				success: false,
				code: 'MISSING_FIELDS',
				message: 'student_id and bus_id are required.',
			});
		}

		// Optional: validate coordinates if provided
		if (latitude !== undefined) {
			if (latitude < -90 || latitude > 90) {
				return res.status(400).json({
					success: false,
					code: 'INVALID_LATITUDE',
					message: 'Latitude must be between -90 and 90.',
				});
			}
		}

		if (longitude !== undefined) {
			if (longitude < -180 || longitude > 180) {
				return res.status(400).json({
					success: false,
					code: 'INVALID_LONGITUDE',
					message: 'Longitude must be between -180 and 180.',
				});
			}
		}

		if (type && type !== 'boarding' && type !== 'exiting') {
			return res.status(400).json({
				success: false,
				code: 'INVALID_TYPE',
				message: "type must be either 'boarding' or 'exiting' if provided.",
			});
		}

		const input: ManualAttendanceInput = {
			studentId: Number(student_id),
			busId: Number(bus_id),
			type,
			timestamp: timestamp ? new Date(timestamp) : undefined,
			latitude: latitude !== undefined ? Number(latitude) : undefined,
			longitude: longitude !== undefined ? Number(longitude) : undefined,
			driverId: Number(req.user.id),
		};

		const result = await AttendanceService.createManualAttendance(input);

		return res.status(201).json({
			success: true,
			data: result,
			message: result.message,
		});
	} catch (error: any) {
		console.error('Manual attendance error:', error);

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
			message: 'An error occurred while recording manual attendance.',
		});
	}
};

/**
 * Get attendance history for a student
 * GET /api/attendance/student/:studentId
 */
export const getStudentAttendance = async (req: Request, res: Response) => {
	try {
		const { studentId } = req.params;
		const { startDate, endDate } = req.query;

		const start = startDate ? new Date(startDate as string) : undefined;
		const end = endDate ? new Date(endDate as string) : undefined;

		const attendance = await AttendanceService.getStudentAttendance(
			Number(studentId),
			start,
			end
		);

		return res.status(200).json({
			success: true,
			data: attendance,
		});
	} catch (error: any) {
		console.error('Get student attendance error:', error);
		return res.status(500).json({
			success: false,
			code: 'INTERNAL_ERROR',
			message: 'An error occurred while fetching attendance.',
		});
	}
};

/**
 * Get bus attendance summary
 * GET /api/attendance/bus/:busId
 */
export const getBusAttendance = async (req: Request, res: Response) => {
	try {
		const { busId } = req.params;
		const { date } = req.query;

		const targetDate = date ? new Date(date as string) : undefined;
		const result = await AttendanceService.getBusAttendance(Number(busId), targetDate);

		return res.status(200).json({
			success: true,
			data: result,
		});
	} catch (error: any) {
		console.error('Get bus attendance error:', error);
		return res.status(500).json({
			success: false,
			code: 'INTERNAL_ERROR',
			message: 'An error occurred while fetching bus attendance.',
		});
	}
};

/**
 * Get all attendance records with filters
 * GET /api/attendance
 */
export const getAllAttendance = async (req: Request, res: Response) => {
	try {
		const {
			studentId,
			busId,
			startDate,
			endDate,
			type,
			limit,
			offset,
		} = req.query;

		const filters: any = {};
		if (studentId) filters.studentId = Number(studentId);
		if (busId) filters.busId = Number(busId);
		if (startDate) filters.startDate = new Date(startDate as string);
		if (endDate) filters.endDate = new Date(endDate as string);
		if (type) filters.type = type as 'boarding' | 'exiting';
		if (limit) filters.limit = Number(limit);
		if (offset) filters.offset = Number(offset);

		const result = await AttendanceService.getAllAttendance(filters);

		return res.status(200).json({
			success: true,
			data: result,
		});
	} catch (error: any) {
		console.error('Get all attendance error:', error);
		return res.status(500).json({
			success: false,
			code: 'INTERNAL_ERROR',
			message: 'An error occurred while fetching attendance records.',
		});
	}
};

