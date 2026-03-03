import { db } from '../../models';
const { Geofence, Student, Bus, Route, RouteAssignment, School } = db;
import { Op } from 'sequelize';
import { validateCoordinates } from '../utils/google-maps';

export interface CreateGeofenceInput {
	name: string;
	type: 'school' | 'home';
	/**
	 * Optional explicit latitude/longitude.
	 * If omitted, the service will derive the center from the linked school (for type 'school')
	 * or from the student's primary pickup location / home coordinates (for type 'home').
	 */
	latitude?: number;
	longitude?: number;
	radius_meters?: number;
	student_id?: number;
	bus_id?: number;
	/** For type 'school': link to school (one geofence per school). If set, bus_id can be null. */
	school_id?: number;
}

export interface UpdateGeofenceInput {
	name?: string;
	type?: 'school' | 'home';
	latitude?: number;
	longitude?: number;
	radius_meters?: number;
	student_id?: number;
	bus_id?: number;
	school_id?: number;
}

export interface GeofenceFilters {
	type?: 'school' | 'home';
	bus_id?: number;
	student_id?: number;
	school_id?: number;
}

export class GeofenceService {
	/**
	 * Create a new geofence
	 */
	static async createGeofence(input: CreateGeofenceInput) {
		// Validate radius
		if (input.radius_meters !== undefined && input.radius_meters < 0) {
			throw {
				status: 400,
				code: 'INVALID_RADIUS',
				message: 'Radius must be a positive number.',
			};
		}

		// Validate type
		if (input.type !== 'school' && input.type !== 'home') {
			throw {
				status: 400,
				code: 'INVALID_TYPE',
				message: "Type must be either 'school' or 'home'.",
			};
		}

		// Validate student_id if provided
		if (input.student_id !== undefined && input.student_id !== null) {
			const student = await Student.findByPk(input.student_id);
			if (!student) {
				throw {
					status: 404,
					code: 'STUDENT_NOT_FOUND',
					message: 'Student not found.',
				};
			}
		}

		// Validate bus_id if provided
		if (input.bus_id !== undefined && input.bus_id !== null) {
			const bus = await Bus.findByPk(input.bus_id);
			if (!bus) {
				throw {
					status: 404,
					code: 'BUS_NOT_FOUND',
					message: 'Bus not found.',
				};
			}
		}

		// Validate school_id if provided (for type 'school')
		if (input.school_id !== undefined && input.school_id !== null) {
			const school = await School.findByPk(input.school_id);
			if (!school) {
				throw {
					status: 404,
					code: 'SCHOOL_NOT_FOUND',
					message: 'School not found.',
				};
			}
		}

		// Derive or validate coordinates depending on type and associations
		let latitude = input.latitude;
		let longitude = input.longitude;

		// For school geofences, prefer school coordinates when school_id is linked
		if (input.type === 'school' && input.school_id) {
			const school = await School.findByPk(input.school_id);
			if (!school) {
				throw {
					status: 404,
					code: 'SCHOOL_NOT_FOUND',
					message: 'School not found.',
				};
			}

			if (school.latitude == null || school.longitude == null) {
				throw {
					status: 400,
					code: 'SCHOOL_COORDINATES_MISSING',
					message: 'School does not have coordinates configured.',
				};
			}

			latitude = Number(school.latitude);
			longitude = Number(school.longitude);
		}

		// For home geofences, prefer the student's primary pickup (route assignment) then home lat/lng
		if (input.type === 'home' && input.student_id) {
			const student = await Student.findByPk(input.student_id, {
				include: [
					{
						model: RouteAssignment,
						required: false,
						// Prefer the optimized route order if available, otherwise any assignment with coordinates
						order: [['pickup_order', 'ASC']],
					},
				],
			} as any);

			if (!student) {
				throw {
					status: 404,
					code: 'STUDENT_NOT_FOUND',
					message: 'Student not found.',
				};
			}

			// Try route assignment pickup location first
			let derivedLat: number | undefined;
			let derivedLng: number | undefined;

			const assignments = ((student as any).routeAssignments || []) as any[];
			const withCoords = assignments.find(
				(a) => a.pickup_latitude != null && a.pickup_longitude != null
			);

			if (withCoords) {
				derivedLat = Number(withCoords.pickup_latitude);
				derivedLng = Number(withCoords.pickup_longitude);
			} else if (student.home_latitude != null && student.home_longitude != null) {
				// Fallback to student's home lat/lng
				derivedLat = Number(student.home_latitude);
				derivedLng = Number(student.home_longitude);
			}

			if (derivedLat != null && derivedLng != null) {
				latitude = derivedLat;
				longitude = derivedLng;
			}
		}

		// If we still don't have coordinates, fall back to explicit latitude/longitude
		if (latitude == null || longitude == null) {
			throw {
				status: 400,
				code: 'MISSING_COORDINATES',
				message:
					'Unable to derive coordinates. Provide latitude/longitude or configure school/route pickup locations.',
			};
		}

		// Coordinate range checks
		if (latitude < -90 || latitude > 90) {
			throw {
				status: 400,
				code: 'INVALID_LATITUDE',
				message: 'Latitude must be between -90 and 90.',
			};
		}

		if (longitude < -180 || longitude > 180) {
			throw {
				status: 400,
				code: 'INVALID_LONGITUDE',
				message: 'Longitude must be between -180 and 180.',
			};
		}

		// Validate coordinates using Google Maps API
		const validation = await validateCoordinates(latitude, longitude);
		if (!validation.valid) {
			throw {
				status: 400,
				code: 'INVALID_COORDINATES',
				message: validation.error || 'Invalid coordinates.',
			};
		}

		// Create geofence
		const geofence = await Geofence.create({
			name: input.name,
			type: input.type,
			latitude,
			longitude,
			radius_meters: input.radius_meters || 50,
			student_id: input.student_id || null,
			bus_id: input.bus_id || null,
			school_id: input.school_id || null,
		});

		// Reload with associations
		return await Geofence.findByPk(geofence.id, {
			include: [
				{ model: Student, attributes: ['id', 'full_name'], required: false },
				{ model: Bus, attributes: ['id', 'bus_number'], required: false },
				{ model: School, attributes: ['id', 'name'], required: false },
			],
		});
	}

	/**
	 * Get all geofences with optional filters
	 */
	static async getAllGeofences(filters?: GeofenceFilters) {
		const where: any = {};

		if (filters?.type) {
			where.type = filters.type;
		}

		if (filters?.bus_id !== undefined) {
			where.bus_id = filters.bus_id;
		}

		if (filters?.student_id !== undefined) {
			where.student_id = filters.student_id;
		}

		if (filters?.school_id !== undefined) {
			where.school_id = filters.school_id;
		}

		return await Geofence.findAll({
			where,
			include: [
				{
					model: Student,
					attributes: ['id', 'full_name'],
					required: false,
				},
				{
					model: Bus,
					attributes: ['id', 'bus_number'],
					required: false,
				},
				{
					model: School,
					attributes: ['id', 'name'],
					required: false,
				},
			],
			order: [['name', 'ASC']],
		});
	}

	/**
	 * Get a specific geofence by ID
	 */
	static async getGeofenceById(id: number) {
		const geofence = await Geofence.findByPk(id, {
			include: [
				{
					model: Student,
					attributes: ['id', 'full_name'],
				},
				{
					model: Bus,
					attributes: ['id', 'bus_number'],
				},
			],
		});

		if (!geofence) {
			throw {
				status: 404,
				code: 'GEOFENCE_NOT_FOUND',
				message: 'Geofence not found.',
			};
		}

		return geofence;
	}

	/**
	 * Update a geofence
	 */
	static async updateGeofence(id: number, input: UpdateGeofenceInput) {
		const geofence = await Geofence.findByPk(id);

		if (!geofence) {
			throw {
				status: 404,
				code: 'GEOFENCE_NOT_FOUND',
				message: 'Geofence not found.',
			};
		}

		// Validate coordinates if provided
		const latitude = input.latitude !== undefined ? input.latitude : geofence.latitude;
		const longitude = input.longitude !== undefined ? input.longitude : geofence.longitude;

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

		// Validate radius if provided
		if (input.radius_meters !== undefined && input.radius_meters < 0) {
			throw {
				status: 400,
				code: 'INVALID_RADIUS',
				message: 'Radius must be a positive number.',
			};
		}

		// Validate type if provided
		if (input.type !== undefined && input.type !== 'school' && input.type !== 'home') {
			throw {
				status: 400,
				code: 'INVALID_TYPE',
				message: "Type must be either 'school' or 'home'.",
			};
		}

		// Validate student_id if provided
		if (input.student_id !== undefined && input.student_id !== null) {
			const student = await Student.findByPk(input.student_id);
			if (!student) {
				throw {
					status: 404,
					code: 'STUDENT_NOT_FOUND',
					message: 'Student not found.',
				};
			}
		}

		// Validate bus_id if provided
		if (input.bus_id !== undefined && input.bus_id !== null) {
			const bus = await Bus.findByPk(input.bus_id);
			if (!bus) {
				throw {
					status: 404,
					code: 'BUS_NOT_FOUND',
					message: 'Bus not found.',
				};
			}
		}

		// Validate school_id if provided
		if (input.school_id !== undefined && input.school_id !== null) {
			const school = await School.findByPk(input.school_id);
			if (!school) {
				throw {
					status: 404,
					code: 'SCHOOL_NOT_FOUND',
					message: 'School not found.',
				};
			}
		}

		// Validate coordinates using Google Maps API if coordinates are being updated
		if (input.latitude !== undefined || input.longitude !== undefined) {
			const validation = await validateCoordinates(latitude, longitude);
			if (!validation.valid) {
				throw {
					status: 400,
					code: 'INVALID_COORDINATES',
					message: validation.error || 'Invalid coordinates.',
				};
			}
		}

		// Update geofence
		await geofence.update({
			name: input.name !== undefined ? input.name : geofence.name,
			type: input.type !== undefined ? input.type : geofence.type,
			latitude: input.latitude !== undefined ? input.latitude : geofence.latitude,
			longitude: input.longitude !== undefined ? input.longitude : geofence.longitude,
			radius_meters: input.radius_meters !== undefined ? input.radius_meters : geofence.radius_meters,
			student_id: input.student_id !== undefined ? input.student_id : geofence.student_id,
			bus_id: input.bus_id !== undefined ? input.bus_id : geofence.bus_id,
			school_id: input.school_id !== undefined ? input.school_id : geofence.school_id,
		});

		// Reload with associations
		return await Geofence.findByPk(geofence.id, {
			include: [
				{
					model: Student,
					attributes: ['id', 'full_name'],
				},
				{
					model: Bus,
					attributes: ['id', 'bus_number'],
				},
				{
					model: School,
					attributes: ['id', 'name'],
				},
			],
		});
	}

	/**
	 * Delete a geofence
	 */
	static async deleteGeofence(id: number) {
		const geofence = await Geofence.findByPk(id);

		if (!geofence) {
			throw {
				status: 404,
				code: 'GEOFENCE_NOT_FOUND',
				message: 'Geofence not found.',
			};
		}

		await geofence.destroy();

		return { success: true, message: 'Geofence deleted successfully.' };
	}

	/**
	 * Get compressed geofences for microcontroller
	 * Returns optimized format for microcontroller storage
	 * Includes school geofence + all student home geofences for the bus route
	 */
	static async getMicrocontrollerGeofences(vehicle_id: string) {
		// 1. Find bus by vehicle_id (bus_number)
		const bus = await Bus.findOne({
			where: { bus_number: vehicle_id },
		});

		if (!bus) {
			throw {
				status: 404,
				code: 'BUS_NOT_FOUND',
				message: `Bus with vehicle_id "${vehicle_id}" not found.`,
			};
		}

		// 2. Get all routes for this bus
		const routes = await Route.findAll({
			where: { bus_id: bus.id },
			include: [
				{
					model: RouteAssignment,
				},
			],
		});

		// 3. Collect all student IDs assigned to this bus's routes
		const studentIds: number[] = [];
		routes.forEach((route) => {
			if (route.routeAssignments) {
				route.routeAssignments.forEach((assignment) => {
					if (assignment.student_id) {
						studentIds.push(assignment.student_id);
					}
				});
			}
		});

		// Remove duplicates
		const uniqueStudentIds = [...new Set(studentIds)];

		// 4. Get school geofence only by bus's school (no legacy bus_id lookup)
		const schoolGeofence = (bus as any).school_id
			? await Geofence.findOne({
					where: { type: 'school', school_id: (bus as any).school_id },
			  })
			: null;

		// 5. Get all home geofences for students on this bus's routes
		const homeGeofences = uniqueStudentIds.length > 0
			? await Geofence.findAll({
					where: {
						type: 'home',
						bus_id: bus.id,
						student_id: {
							[Op.in]: uniqueStudentIds,
						},
					},
			  })
			: [];

		// 6. Format as compressed array for microcontroller
		// Format: [[lat, lng, radius, type], ...]
		// type: 0 = school, 1 = home
		const compressedGeofences: Array<[number, number, number, number]> = [];

		// Add school geofence if exists
		if (schoolGeofence) {
			compressedGeofences.push([
				Number(schoolGeofence.latitude),
				Number(schoolGeofence.longitude),
				schoolGeofence.radius_meters || 50,
				0, // 0 = school
			]);
		}

		// Add all home geofences
		homeGeofences.forEach((geofence) => {
			compressedGeofences.push([
				Number(geofence.latitude),
				Number(geofence.longitude),
				geofence.radius_meters || 50,
				1, // 1 = home
			]);
		});

		return {
			vehicle_id: bus.bus_number,
			bus_id: bus.id,
			geofences: compressedGeofences,
			count: compressedGeofences.length,
		};
	}

	/**
	 * After a route has been optimized, align student home geofences with the
	 * optimized pickup waypoints for that route's bus.
	 *
	 * We derive per-student centers directly from the RouteAssignment pickup
	 * latitude/longitude (route table), optionally averaging if a student has
	 * multiple assignments, and then batch-update/create home geofences for
	 * that route's bus.
	 */
	static async syncHomeGeofencesForOptimizedRoute(
		routeId: number,
		_waypoints: { assignmentIds: number[]; latitude: number; longitude: number }[]
	) {
		const route = await Route.findByPk(routeId);
		if (!route) {
			return;
		}

		const busId = (route as any).bus_id as number | undefined;
		if (!busId) {
			return;
		}

		// Load all assignments with pickup coordinates for this route
		const assignments = await RouteAssignment.findAll({
			where: { route_id: routeId },
			attributes: ['id', 'student_id', 'pickup_latitude', 'pickup_longitude'],
		});

		if (!assignments.length) {
			return;
		}

		// Derive a representative pickup center per student (average of their pickup coordinates)
		const studentCenters = new Map<number, { sumLat: number; sumLng: number; count: number }>();
		for (const a of assignments) {
			if (a.pickup_latitude == null || a.pickup_longitude == null) continue;
			const studentId = a.student_id;
			const current = studentCenters.get(studentId) ?? {
				sumLat: 0,
				sumLng: 0,
				count: 0,
			};
			current.sumLat += Number(a.pickup_latitude);
			current.sumLng += Number(a.pickup_longitude);
			current.count += 1;
			studentCenters.set(studentId, current);
		}

		if (!studentCenters.size) {
			return;
		}

		const studentIds = Array.from(studentCenters.keys());

		// Batch load existing home geofences for these students on this bus
		const existingGeofences = await Geofence.findAll({
			where: {
				type: 'home',
				bus_id: busId,
				student_id: {
					[Op.in]: studentIds,
				},
			},
		});

		const existingByStudent = new Map<number, InstanceType<typeof Geofence>>();
		for (const g of existingGeofences) {
			existingByStudent.set((g as any).student_id as number, g);
		}

		// Apply updates / creates per student (db writes still per-student, but reads are batched)
		for (const [studentId, agg] of studentCenters.entries()) {
			const lat = agg.sumLat / agg.count;
			const lng = agg.sumLng / agg.count;
			const existing = existingByStudent.get(studentId);

			if (existing) {
				await this.updateGeofence(existing.id, {
					latitude: lat,
					longitude: lng,
				});
			} else {
				await this.createGeofence({
					name: `Student ${studentId} home`,
					type: 'home',
					latitude: lat,
					longitude: lng,
					student_id: studentId,
					bus_id: busId,
				});
			}
		}
	}
}
