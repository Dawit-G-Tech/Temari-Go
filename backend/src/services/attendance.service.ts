import { db } from '../../models';
const { Attendance, RFIDCard, Student, Bus, Geofence } = db;
import type { Bus as BusModel } from '../../models/bus.model';
import { Op } from 'sequelize';
import { findMatchingGeofence, type GeofenceData } from '../utils/geofence';
import { NotificationService } from './notification.service';

export interface AttendanceScanInput {
	rfid_tag: string;
	timestamp?: string | Date;
	latitude: number;
	longitude: number;
	vehicle_id?: string;
	bus_id?: number;
}

export interface AttendanceScanResult {
	success: boolean;
	attendanceType: 'boarding' | 'exiting';
	studentId: number;
	studentName: string;
	geofenceId?: number;
	geofenceName?: string;
	message: string;
}

export class AttendanceService {
	/**
	 * Process RFID scan and create attendance record
	 */
	static async processScan(input: AttendanceScanInput): Promise<AttendanceScanResult> {
		// 1. Validate and find RFID card
		const rfidCard = await RFIDCard.findOne({
			where: { rfid_tag: input.rfid_tag, active: true },
			include: [
				{
					model: Student,
					include: [
						{
							model: db.User,
							as: 'parent',
						},
					],
				},
			],
		});

		if (!rfidCard) {
			throw {
				status: 404,
				code: 'RFID_NOT_FOUND',
				message: 'RFID card not found or inactive.',
			};
		}

		const student = rfidCard.student;
		if (!student) {
			throw {
				status: 404,
				code: 'STUDENT_NOT_FOUND',
				message: 'Student associated with RFID card not found.',
			};
		}

		// 2. Find bus by vehicle_id or bus_id
		let bus: BusModel | null = null;
		if (input.bus_id) {
			bus = await Bus.findByPk(input.bus_id);
		} else if (input.vehicle_id) {
			bus = await Bus.findOne({ where: { bus_number: input.vehicle_id } });
		}

		if (!bus) {
			throw {
				status: 404,
				code: 'BUS_NOT_FOUND',
				message: 'Bus not found.',
			};
		}

		// 3. Get relevant geofences for this bus
		const geofences = await Geofence.findAll({
			where: {
				bus_id: bus.id,
			},
		});

		// Also get school geofence (if exists)
		const schoolGeofence = await Geofence.findOne({
			where: {
				type: 'school',
				bus_id: bus.id,
			},
		});

		// Get student's home geofence
		const homeGeofence = await Geofence.findOne({
			where: {
				type: 'home',
				student_id: student.id,
				bus_id: bus.id,
			},
		});

		// Combine all relevant geofences
		const allGeofences: GeofenceData[] = [];
		if (schoolGeofence) {
			allGeofences.push({
				id: schoolGeofence.id,
				type: schoolGeofence.type,
				latitude: Number(schoolGeofence.latitude),
				longitude: Number(schoolGeofence.longitude),
				radius_meters: schoolGeofence.radius_meters || 50,
				bus_id: schoolGeofence.bus_id || undefined,
			});
		}
		if (homeGeofence) {
			allGeofences.push({
				id: homeGeofence.id,
				type: homeGeofence.type,
				latitude: Number(homeGeofence.latitude),
				longitude: Number(homeGeofence.longitude),
				radius_meters: homeGeofence.radius_meters || 50,
				student_id: homeGeofence.student_id || undefined,
				bus_id: homeGeofence.bus_id || undefined,
			});
		}

		// 4. Determine attendance type using geofencing
		let attendanceType: 'boarding' | 'exiting' = 'boarding';
		let matchedGeofence: GeofenceData | null = null;

		if (allGeofences.length > 0) {
			matchedGeofence = findMatchingGeofence(
				input.latitude,
				input.longitude,
				allGeofences
			);

			if (matchedGeofence) {
				// If within school geofence, student is exiting
				// If within home geofence, student is boarding
				attendanceType = matchedGeofence.type === 'school' ? 'exiting' : 'boarding';
			} else {
				// If not in any geofence, use time-based heuristics
				// Morning scans are typically boarding, afternoon are exiting
				const hour = new Date(input.timestamp || Date.now()).getHours();
				attendanceType = hour < 12 ? 'boarding' : 'exiting';
			}
		} else {
			// No geofences configured, use time-based heuristics
			const hour = new Date(input.timestamp || Date.now()).getHours();
			attendanceType = hour < 12 ? 'boarding' : 'exiting';
		}

		// 5. Create attendance record
		const attendance = await Attendance.create({
			student_id: student.id,
			bus_id: bus.id,
			rfid_card_id: rfidCard.id,
			type: attendanceType,
			timestamp: input.timestamp ? new Date(input.timestamp) : new Date(),
			latitude: input.latitude,
			longitude: input.longitude,
			geofence_id: matchedGeofence?.id,
			manual_override: false,
		});

		// 6. Send notification to parent
		// Reload student with parent to ensure we have the relationship
		const studentWithParent = await Student.findByPk(student.id, {
			include: [{ model: db.User, as: 'parent' }],
		});

		if (studentWithParent && (studentWithParent as any).parent) {
			const parent = (studentWithParent as any).parent;
			const locationName = matchedGeofence
				? matchedGeofence.type === 'school'
					? 'School'
					: 'Home'
				: undefined;

			await NotificationService.sendAttendanceNotification(
				parent.id,
				student.full_name,
				attendanceType,
				locationName
			);
		}

		// 7. Return result
		return {
			success: true,
			attendanceType,
			studentId: student.id,
			studentName: student.full_name,
			geofenceId: matchedGeofence?.id,
			geofenceName: matchedGeofence
				? matchedGeofence.type === 'school'
					? 'School'
					: 'Home'
				: undefined,
			message: `Attendance recorded: ${student.full_name} ${attendanceType === 'boarding' ? 'boarded' : 'exited'} the bus`,
		};
	}

	/**
	 * Get attendance history for a student
	 */
	static async getStudentAttendance(
		studentId: number,
		startDate?: Date,
		endDate?: Date
	) {
		const where: any = { student_id: studentId };
		if (startDate || endDate) {
			where.timestamp = {};
			if (startDate) where.timestamp[Op.gte] = startDate;
			if (endDate) where.timestamp[Op.lte] = endDate;
		}

		return await Attendance.findAll({
			where,
			include: [
				{ model: Bus, attributes: ['id', 'bus_number'] },
				{ model: Geofence, attributes: ['id', 'name', 'type'] },
			],
			order: [['timestamp', 'DESC']],
		});
	}

	/**
	 * Get current onboard students for a bus
	 */
	static async getBusAttendance(busId: number, date?: Date) {
		const targetDate = date || new Date();
		const startOfDay = new Date(targetDate);
		startOfDay.setHours(0, 0, 0, 0);
		const endOfDay = new Date(targetDate);
		endOfDay.setHours(23, 59, 59, 999);

		// Get all attendance records for today
		const attendances = await Attendance.findAll({
			where: {
				bus_id: busId,
				timestamp: {
					[Op.between]: [startOfDay, endOfDay],
				},
			},
			include: [
				{ model: Student, attributes: ['id', 'full_name', 'grade'] },
			],
			order: [['timestamp', 'DESC']],
		});

		// Calculate onboard students (boarding - exiting)
		const onboardMap = new Map<number, number>();
		attendances.forEach((attendance) => {
			const studentId = attendance.student_id;
			const current = onboardMap.get(studentId) || 0;
			if (attendance.type === 'boarding') {
				onboardMap.set(studentId, current + 1);
			} else {
				onboardMap.set(studentId, Math.max(0, current - 1));
			}
		});

		const onboardStudents: number[] = [];
		onboardMap.forEach((count, studentId) => {
			if (count > 0) {
				onboardStudents.push(studentId);
			}
		});

		return {
			onboardCount: onboardStudents.length,
			onboardStudents,
			attendances,
		};
	}

	/**
	 * Get all attendance records with filters
	 */
	static async getAllAttendance(filters: {
		studentId?: number;
		busId?: number;
		startDate?: Date;
		endDate?: Date;
		type?: 'boarding' | 'exiting';
		limit?: number;
		offset?: number;
	}) {
		const where: any = {};

		if (filters.studentId) {
			where.student_id = filters.studentId;
		}

		if (filters.busId) {
			where.bus_id = filters.busId;
		}

		if (filters.type) {
			where.type = filters.type;
		}

		if (filters.startDate || filters.endDate) {
			where.timestamp = {};
			if (filters.startDate) where.timestamp[Op.gte] = filters.startDate;
			if (filters.endDate) where.timestamp[Op.lte] = filters.endDate;
		}

		const { count, rows } = await Attendance.findAndCountAll({
			where,
			include: [
				{
					model: Student,
					attributes: ['id', 'full_name', 'grade'],
				},
				{
					model: Bus,
					attributes: ['id', 'bus_number'],
				},
				{
					model: Geofence,
					attributes: ['id', 'name', 'type'],
				},
			],
			order: [['timestamp', 'DESC']],
			limit: filters.limit || 50,
			offset: filters.offset || 0,
		});

		return {
			total: count,
			attendances: rows,
		};
	}
}

