import { db } from '../../models';
const { Bus, User, Route, Role, School } = db;
import { LocationService } from './location.service';
import { AttendanceService } from './attendance.service';

export interface CreateBusInput {
	bus_number: string;
	capacity?: number;
	driver_id?: number | null;
	school_id?: number | null;
}

export interface UpdateBusInput {
	bus_number?: string;
	capacity?: number;
	driver_id?: number | null;
	school_id?: number | null;
}

export class BusService {
	/**
	 * Create a new bus
	 */
	static async createBus(input: CreateBusInput) {
		const { bus_number, capacity, driver_id, school_id } = input;

		if (!bus_number || typeof bus_number !== 'string' || !bus_number.trim()) {
			throw {
				status: 400,
				code: 'MISSING_BUS_NUMBER',
				message: 'Bus number is required.',
			};
		}

		const trimmed = bus_number.trim();
		const existing = await Bus.findOne({ where: { bus_number: trimmed } });
		if (existing) {
			throw {
				status: 409,
				code: 'BUS_NUMBER_EXISTS',
				message: 'A bus with this bus number already exists.',
			};
		}

		if (driver_id != null) {
			const driver = await User.findByPk(Number(driver_id));
			if (!driver) {
				throw {
					status: 400,
					code: 'DRIVER_NOT_FOUND',
					message: 'Driver user not found.',
				};
			}
		}

		if (school_id != null) {
			const school = await School.findByPk(Number(school_id));
			if (!school) {
				throw {
					status: 400,
					code: 'SCHOOL_NOT_FOUND',
					message: 'School not found.',
				};
			}
		}

		const driverId =
			driver_id != null && String(driver_id).trim() !== '' ? Number(driver_id) : null;
		const schoolId = school_id != null ? Number(school_id) : null;

		const bus = await Bus.create({
			bus_number: trimmed,
			capacity: capacity !== undefined ? Number(capacity) : 50,
			driver_id: driverId,
			school_id: schoolId,
		});

		return bus.toJSON();
	}

	/**
	 * List all buses with driver info and routes
	 */
	static async getAllBuses() {
		const buses = await Bus.findAll({
			attributes: ['id', 'bus_number', 'capacity', 'driver_id', 'school_id'],
			include: [
				{
					model: User,
					as: 'driver',
					attributes: ['id', 'name', 'email'],
					required: false,
				},
				{
					model: School,
					as: 'school',
					attributes: ['id', 'name'],
					required: false,
				},
				{
					model: Route,
					as: 'routes',
					attributes: ['id', 'name', 'start_time', 'end_time'],
					required: false,
				},
			],
			order: [['bus_number', 'ASC']],
		});

		return buses.map((b) => b.toJSON());
	}

	/**
	 * Get bus by ID with driver, routes, current location, onboard students
	 */
	static async getBusById(id: number) {
		const bus = await Bus.findByPk(id, {
			attributes: ['id', 'bus_number', 'capacity', 'driver_id', 'school_id'],
			include: [
				{
					model: User,
					as: 'driver',
					attributes: ['id', 'name', 'email'],
					required: false,
				},
				{
					model: School,
					as: 'school',
					attributes: ['id', 'name', 'address', 'latitude', 'longitude'],
					required: false,
				},
				{
					model: Route,
					as: 'routes',
					attributes: ['id', 'name', 'start_time', 'end_time'],
					required: false,
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

		const [currentLocation, attendanceSummary] = await Promise.all([
			LocationService.getCurrentBusLocation(id),
			AttendanceService.getBusAttendance(id).catch(() => null),
		]);

		const payload: any = bus.toJSON();
		payload.currentLocation = currentLocation
			? {
					id: currentLocation.id,
					latitude: currentLocation.latitude,
					longitude: currentLocation.longitude,
					speed: currentLocation.speed,
					timestamp: currentLocation.timestamp,
			  }
			: null;
		payload.onboardStudents = attendanceSummary?.onboardStudents ?? [];
		payload.attendanceStatistics = attendanceSummary?.statistics ?? null;

		return payload;
	}

	/**
	 * Update bus
	 */
	static async updateBus(id: number, input: UpdateBusInput) {
		const bus = await Bus.findByPk(id);
		if (!bus) {
			throw {
				status: 404,
				code: 'BUS_NOT_FOUND',
				message: 'Bus not found.',
			};
		}

		if (input.bus_number !== undefined) {
			const trimmed =
				typeof input.bus_number === 'string' ? input.bus_number.trim() : '';
			if (!trimmed) {
				throw {
					status: 400,
					code: 'INVALID_BUS_NUMBER',
					message: 'Bus number cannot be empty.',
				};
			}
			const existing = await Bus.findOne({
				where: { bus_number: trimmed },
			});
			if (existing && existing.id !== id) {
				throw {
					status: 409,
					code: 'BUS_NUMBER_EXISTS',
					message: 'A bus with this bus number already exists.',
				};
			}
			(bus as any).bus_number = trimmed;
		}

		if (input.capacity !== undefined) {
			(bus as any).capacity = Number(input.capacity);
		}

		if (input.driver_id !== undefined) {
			if (input.driver_id === null || String(input.driver_id).trim() === '') {
				(bus as any).driver_id = null;
			} else {
				const driver = await User.findByPk(Number(input.driver_id));
				if (!driver) {
					throw {
						status: 400,
						code: 'DRIVER_NOT_FOUND',
						message: 'Driver user not found.',
					};
				}
				(bus as any).driver_id = driver.id;
			}
		}

		if (input.school_id !== undefined) {
			if (input.school_id === null) {
				(bus as any).school_id = null;
			} else {
				const school = await School.findByPk(Number(input.school_id));
				if (!school) {
					throw {
						status: 400,
						code: 'SCHOOL_NOT_FOUND',
						message: 'School not found.',
					};
				}
				(bus as any).school_id = school.id;
			}
		}

		await bus.save();
		return bus.toJSON();
	}

	/**
	 * Delete bus (hard delete)
	 */
	static async deleteBus(id: number) {
		const bus = await Bus.findByPk(id);
		if (!bus) {
			throw {
				status: 404,
				code: 'BUS_NOT_FOUND',
				message: 'Bus not found.',
			};
		}

		await bus.destroy();
		return { deleted: true, id };
	}

	/**
	 * Assign driver to bus. Validates driver role and clears previous bus assignment.
	 */
	static async assignDriver(busId: number, driverId: number) {
		const bus = await Bus.findByPk(busId);
		if (!bus) {
			throw {
				status: 404,
				code: 'BUS_NOT_FOUND',
				message: 'Bus not found.',
			};
		}

		const driver = await User.findByPk(driverId, {
			include: [Role],
		});
		if (!driver) {
			throw {
				status: 404,
				code: 'DRIVER_NOT_FOUND',
				message: 'User not found.',
			};
		}

		const roleName = (driver as any).role?.name;
		if (roleName !== 'driver') {
			throw {
				status: 400,
				code: 'INVALID_DRIVER_ROLE',
				message: 'User must have the driver role to be assigned to a bus.',
			};
		}

		// Unassign this driver from any other bus
		await Bus.update(
			{ driver_id: null },
			{ where: { driver_id: driverId } }
		);

		// Assign driver to this bus
		(bus as any).driver_id = driverId;
		await bus.save();

		// Return bus with driver included
		const updated = await Bus.findByPk(busId, {
			attributes: ['id', 'bus_number', 'capacity', 'driver_id'],
			include: [
				{
					model: User,
					as: 'driver',
					attributes: ['id', 'name', 'email'],
				},
			],
		});
		return updated?.toJSON();
	}
}
