import { db } from '../../models';
const { Location, Bus, User, Role } = db;
import { Op } from 'sequelize';
import { NotificationService } from './notification.service';

export interface LocationUpdateInput {
	bus_id: number;
	latitude: number;
	longitude: number;
	speed?: number;
	timestamp?: Date | string;
}

export interface LocationUpdateResult {
	success: boolean;
	locationId: number;
	speedViolation?: {
		detected: boolean;
		speed: number;
		speedLimit: number;
		message?: string;
	};
}

/**
 * Default speed limit for school buses in km/h
 * Can be configured via environment variable SPEED_LIMIT_KMH
 */
const DEFAULT_SPEED_LIMIT = 60; // km/h
const SPEED_LIMIT = Number(process.env.SPEED_LIMIT_KMH) || DEFAULT_SPEED_LIMIT;

export class LocationService {
	/**
	 * Create a location update from microcontroller
	 * Detects speed violations and sends notifications
	 */
	static async createLocationUpdate(input: LocationUpdateInput): Promise<LocationUpdateResult> {
		// 1. Validate bus exists
		const bus = await Bus.findByPk(input.bus_id, {
			include: [
				{
					model: User,
					as: 'driver',
				},
			],
		});

		if (!bus) {
			throw {
				status: 404,
				code: 'BUS_NOT_FOUND',
				message: 'Bus not found.',
			};
		}

		// 2. Validate coordinates
		if (input.latitude < -90 || input.latitude > 90) {
			throw {
				status: 400,
				code: 'INVALID_LATITUDE',
				message: 'Latitude must be between -90 and 90.',
			};
		}

		if (input.longitude < -180 || input.longitude > 180) {
			throw {
				status: 400,
				code: 'INVALID_LONGITUDE',
				message: 'Longitude must be between -180 and 180.',
			};
		}

		// 3. Validate speed if provided
		if (input.speed !== undefined && input.speed !== null) {
			if (input.speed < 0) {
				throw {
					status: 400,
					code: 'INVALID_SPEED',
					message: 'Speed cannot be negative.',
				};
			}
			// Reasonable upper limit (e.g., 200 km/h)
			if (input.speed > 200) {
				throw {
					status: 400,
					code: 'INVALID_SPEED',
					message: 'Speed value is unreasonably high.',
				};
			}
		}

		// 4. Create location record
		const location = await Location.create({
			bus_id: input.bus_id,
			latitude: input.latitude,
			longitude: input.longitude,
			speed: input.speed !== undefined && input.speed !== null ? Number(input.speed) : null,
			timestamp: input.timestamp ? new Date(input.timestamp) : new Date(),
		});

		// 5. Check for speed violation
		let speedViolation: LocationUpdateResult['speedViolation'] | undefined;

		if (input.speed !== undefined && input.speed !== null && input.speed > SPEED_LIMIT) {
			speedViolation = {
				detected: true,
				speed: Number(input.speed),
				speedLimit: SPEED_LIMIT,
				message: `Speed violation detected: ${input.speed.toFixed(2)} km/h exceeds limit of ${SPEED_LIMIT} km/h`,
			};

			// Send notifications for speed violation
			await this.handleSpeedViolation(bus, input.speed, SPEED_LIMIT, input.latitude, input.longitude);
		}

		return {
			success: true,
			locationId: location.id,
			speedViolation,
		};
	}

	/**
	 * Handle speed violation by sending notifications
	 */
	private static async handleSpeedViolation(
		bus: any,
		speed: number,
		speedLimit: number,
		latitude: number,
		longitude: number
	): Promise<void> {
		try {
			// Notify admin users
			const adminRole = await Role.findOne({ where: { name: 'admin' } });
			const admins = adminRole
				? await User.findAll({
						where: {
							roleId: adminRole.id,
						},
					})
				: [];

			for (const admin of admins) {
				await NotificationService.sendNotification({
					userId: admin.id,
					type: 'speed_violation',
					message: `Speed violation detected on bus ${bus.bus_number}: ${speed.toFixed(2)} km/h (limit: ${speedLimit} km/h)`,
					data: {
						busId: bus.id,
						busNumber: bus.bus_number,
						speed: speed,
						speedLimit: speedLimit,
						latitude: latitude,
						longitude: longitude,
						timestamp: new Date().toISOString(),
					},
				});
			}

			// Notify driver if assigned
			if (bus.driver_id && bus.driver) {
				await NotificationService.sendNotification({
					userId: bus.driver_id,
					type: 'speed_violation',
					message: `Speed violation: You are driving at ${speed.toFixed(2)} km/h (limit: ${speedLimit} km/h). Please reduce speed.`,
					data: {
						busId: bus.id,
						busNumber: bus.bus_number,
						speed: speed,
						speedLimit: speedLimit,
						latitude: latitude,
						longitude: longitude,
						timestamp: new Date().toISOString(),
					},
				});
			}
		} catch (error) {
			console.error('Error handling speed violation notification:', error);
			// Don't throw - notification failure shouldn't break location update
		}
	}

	/**
	 * Get location history for a bus
	 */
	static async getBusLocations(busId: number, startDate?: Date, endDate?: Date, limit?: number) {
		const where: any = { bus_id: busId };

		if (startDate || endDate) {
			where.timestamp = {};
			if (startDate) where.timestamp[Op.gte] = startDate;
			if (endDate) where.timestamp[Op.lte] = endDate;
		}

		return await Location.findAll({
			where,
			include: [
				{
					model: Bus,
					attributes: ['id', 'bus_number'],
				},
			],
			order: [['timestamp', 'DESC']],
			limit: limit || 100,
		});
	}

	/**
	 * Get the latest (current) location for a bus
	 */
	static async getCurrentBusLocation(busId: number) {
		const location = await Location.findOne({
			where: { bus_id: busId },
			include: [
				{
					model: Bus,
					attributes: ['id', 'bus_number'],
				},
			],
			order: [['timestamp', 'DESC']],
		});

		return location;
	}
}
