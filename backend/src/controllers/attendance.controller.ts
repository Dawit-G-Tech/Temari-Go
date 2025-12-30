import { Request, Response } from 'express';
import { AttendanceService, type AttendanceScanInput } from '../services/attendance.service';

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

