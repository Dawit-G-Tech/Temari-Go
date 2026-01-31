import { db } from '../../models';
const { AlcoholTest, Bus, User, Role } = db;
import { Op } from 'sequelize';
import { NotificationService } from './notification.service';

export interface AlcoholTestInput {
	bus_id?: number;
	vehicle_id?: string;
	alcohol_level: number;
	latitude?: number;
	longitude?: number;
	timestamp?: Date;
}

export interface AlcoholTestResult {
	success: boolean;
	testId: number;
	passed: boolean;
	alcohol_level: number;
	threshold: number;
	driver_id: number;
	bus_id: number;
	bus_number: string;
	message: string;
}

/**
 * Alcohol test threshold in mg/L
 * Default: 0.05 mg/L (can be configured via environment variable)
 */
const DEFAULT_ALCOHOL_THRESHOLD = 0.05;
const ALCOHOL_THRESHOLD = Number(process.env.ALCOHOL_THRESHOLD_MG_L) || DEFAULT_ALCOHOL_THRESHOLD;

export class AlcoholTestService {
	/**
	 * Submit alcohol test from microcontroller
	 * Fetches driver_id from bus assignment automatically
	 */
	static async submitAlcoholTest(input: AlcoholTestInput): Promise<AlcoholTestResult> {
		// 1. Validate alcohol level
		if (input.alcohol_level === undefined || input.alcohol_level === null) {
			throw {
				status: 400,
				code: 'MISSING_ALCOHOL_LEVEL',
				message: 'alcohol_level is required.',
			};
		}

		if (input.alcohol_level < 0) {
			throw {
				status: 400,
				code: 'INVALID_ALCOHOL_LEVEL',
				message: 'Alcohol level cannot be negative.',
			};
		}

		// 2. Find bus by bus_id or vehicle_id
		let bus: any = null;
		if (input.bus_id) {
			bus = await Bus.findByPk(input.bus_id, {
				include: [
					{
						model: User,
						as: 'driver',
						attributes: ['id', 'name', 'email'],
					},
				],
			});
		} else if (input.vehicle_id) {
			bus = await Bus.findOne({
				where: { bus_number: input.vehicle_id },
				include: [
					{
						model: User,
						as: 'driver',
						attributes: ['id', 'name', 'email'],
					},
				],
			});
		}

		if (!bus) {
			throw {
				status: 404,
				code: 'BUS_NOT_FOUND',
				message: 'Bus not found. Please provide valid bus_id or vehicle_id.',
			};
		}

		// 3. Get driver_id from bus assignment
		if (!bus.driver_id) {
			throw {
				status: 400,
				code: 'NO_DRIVER_ASSIGNED',
				message: `No driver assigned to bus ${bus.bus_number}. Cannot submit alcohol test.`,
			};
		}

		// 4. Validate coordinates if provided
		if (input.latitude !== undefined) {
			if (input.latitude < -90 || input.latitude > 90) {
				throw {
					status: 400,
					code: 'INVALID_LATITUDE',
					message: 'Latitude must be between -90 and 90.',
				};
			}
		}

		if (input.longitude !== undefined) {
			if (input.longitude < -180 || input.longitude > 180) {
				throw {
					status: 400,
					code: 'INVALID_LONGITUDE',
					message: 'Longitude must be between -180 and 180.',
				};
			}
		}

		// 5. Evaluate against threshold
		const passed = input.alcohol_level <= ALCOHOL_THRESHOLD;

		// 6. Create alcohol test record
		const alcoholTest = await AlcoholTest.create({
			driver_id: bus.driver_id,
			bus_id: bus.id,
			alcohol_level: input.alcohol_level,
			passed: passed,
			latitude: input.latitude !== undefined ? input.latitude : null,
			longitude: input.longitude !== undefined ? input.longitude : null,
			timestamp: input.timestamp || new Date(),
		});

		// 7. If test failed, send immediate admin alert
		if (!passed) {
			await this.sendAdminAlert(bus, alcoholTest.id, input.alcohol_level, ALCOHOL_THRESHOLD);
		}

		// 8. Return result
		const message = passed
			? `Alcohol test passed. Level: ${input.alcohol_level.toFixed(3)} mg/L (threshold: ${ALCOHOL_THRESHOLD} mg/L)`
			: `ALERT: Alcohol test failed. Level: ${input.alcohol_level.toFixed(3)} mg/L exceeds threshold of ${ALCOHOL_THRESHOLD} mg/L. Admin has been notified.`;

		return {
			success: true,
			testId: alcoholTest.id,
			passed: passed,
			alcohol_level: input.alcohol_level,
			threshold: ALCOHOL_THRESHOLD,
			driver_id: bus.driver_id,
			bus_id: bus.id,
			bus_number: bus.bus_number,
			message: message,
		};
	}

	/**
	 * Send immediate FCM alert to all admin users when alcohol test fails
	 */
	private static async sendAdminAlert(
		bus: any,
		testId: number,
		alcoholLevel: number,
		threshold: number
	): Promise<void> {
		try {
			// Get all admin users
			const adminRole = await Role.findOne({ where: { name: 'admin' } });
			if (!adminRole) {
				console.warn('Admin role not found. Cannot send alcohol test alert.');
				return;
			}

			const admins = await User.findAll({
				where: {
					roleId: adminRole.id,
				},
			});

			const driverName = bus.driver?.name || 'Unknown Driver';

			// Send notification to each admin
			for (const admin of admins) {
				await NotificationService.sendNotification({
					userId: admin.id,
					type: 'alcohol_alert',
					message: `URGENT: Driver ${driverName} (Bus ${bus.bus_number}) failed alcohol test. Level: ${alcoholLevel.toFixed(3)} mg/L (threshold: ${threshold} mg/L)`,
					data: {
						testId: testId,
						driverId: bus.driver_id,
						driverName: driverName,
						busId: bus.id,
						busNumber: bus.bus_number,
						alcoholLevel: alcoholLevel,
						threshold: threshold,
						timestamp: new Date().toISOString(),
						urgent: true,
					},
				});
			}

			console.log(
				`Alcohol test alert sent to ${admins.length} admin(s) for bus ${bus.bus_number}`
			);
		} catch (error) {
			console.error('Error sending admin alert for alcohol test:', error);
			// Don't throw - notification failure shouldn't break test submission
		}
	}

	/**
	 * Get alcohol test history for a driver
	 * Supports filtering by date range
	 */
	static async getDriverAlcoholTests(
		driverId: number,
		startDate?: Date,
		endDate?: Date,
		limit?: number
	) {
		const where: any = {
			driver_id: driverId,
		};

		// Add date range filtering if provided
		if (startDate || endDate) {
			where.timestamp = {};
			if (startDate) {
				where.timestamp[Op.gte] = startDate;
			}
			if (endDate) {
				where.timestamp[Op.lte] = endDate;
			}
		}

		return await AlcoholTest.findAll({
			where,
			include: [
				{
					model: Bus,
					attributes: ['id', 'bus_number'],
				},
			],
			order: [['timestamp', 'DESC']],
			limit: limit || 50,
		});
	}

	/**
	 * Get alcohol test history for a bus
	 */
	static async getBusAlcoholTests(busId: number, limit?: number) {
		return await AlcoholTest.findAll({
			where: {
				bus_id: busId,
			},
			include: [
				{
					model: User,
					as: 'driver',
					attributes: ['id', 'full_name'],
				},
			],
			order: [['timestamp', 'DESC']],
			limit: limit || 50,
		});
	}
}
