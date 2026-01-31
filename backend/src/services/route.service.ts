import { db } from '../../models';
import { getDirections, type DirectionsResult, type LatLng } from '../utils/google-maps';
const { Route, RouteAssignment, Bus, Student } = db;

/** Default radius (km) to group students into the same pickup zone. ~200m. */
const DEFAULT_ZONE_RADIUS_KM = 0.2;

/** Earth radius in km for Haversine. */
const EARTH_RADIUS_KM = 6371;

/**
 * Haversine distance between two lat/lng points in km.
 */
function haversineKm(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number
): number {
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return EARTH_RADIUS_KM * c;
}

export interface CreateRouteInput {
	bus_id: number;
	name: string;
	start_time?: string;
	end_time?: string;
}

export interface UpdateRouteInput {
	bus_id?: number;
	name?: string;
	start_time?: string;
	end_time?: string;
}

export interface RouteFilters {
	bus_id?: number;
}

export interface OptimizeRouteOptions {
	/** Radius in km to group pickups into the same zone. Default 0.2 (~200m). */
	zoneRadiusKm?: number;
}

export interface WaypointStudent {
	id: number;
	full_name: string;
	grade?: string;
	parent_id?: number;
}

export interface OptimizedWaypoint {
	/** Stop index (0-based). */
	sequence: number;
	latitude: number;
	longitude: number;
	/** Students picked up at this stop. */
	students: WaypointStudent[];
	/** Route assignment IDs at this stop. */
	assignmentIds: number[];
}

export interface GetDirectionsOptions {
	/** Optional start point (e.g. depot/school). If omitted, first stop is used. */
	origin?: LatLng;
	/** Optional end point (e.g. school/depot). If omitted, last stop is used. */
	destination?: LatLng;
}

export class RouteService {
	/**
	 * Create a new route (link to bus, set start/end times)
	 */
	static async createRoute(input: CreateRouteInput) {
		const { bus_id, name, start_time, end_time } = input;

		if (!name || typeof name !== 'string' || !name.trim()) {
			throw {
				status: 400,
				code: 'MISSING_NAME',
				message: 'Route name is required.',
			};
		}

		const busId = bus_id != null && String(bus_id).trim() !== '' ? Number(bus_id) : NaN;
		if (Number.isNaN(busId)) {			throw {
				status: 400,
				code: 'MISSING_BUS_ID',
				message: 'bus_id is required.',
			};
		}

		const bus = await Bus.findByPk(busId);
		if (!bus) {
			throw {
				status: 400,
				code: 'BUS_NOT_FOUND',
				message: 'Bus not found.',
			};
		}

		const route = await Route.create({
			bus_id: busId,
			name: name.trim(),
			start_time: start_time ?? undefined,
			end_time: end_time ?? undefined,
		});

		return route.toJSON();
	}

	/**
	 * List all routes, optionally filter by bus_id
	 */
	static async getAllRoutes(filters?: RouteFilters) {
		const where: any = {};
		if (filters?.bus_id != null) {
			where.bus_id = Number(filters.bus_id);
		}

		const routes = await Route.findAll({
			attributes: ['id', 'bus_id', 'name', 'start_time', 'end_time'],
			include: [
				{
					model: Bus,
					as: 'bus',
					attributes: ['id', 'bus_number', 'capacity'],
					required: false,
				},
			],
			where: Object.keys(where).length ? where : undefined,
			order: [['name', 'ASC']],
		});

		return routes.map((r) => r.toJSON());
	}

	/**
	 * Get route by ID with assigned students and pickup points
	 */
	static async getRouteById(id: number) {
		const route = await Route.findByPk(id, {
			attributes: ['id', 'bus_id', 'name', 'start_time', 'end_time'],
			include: [
				{
					model: Bus,
					as: 'bus',
					attributes: ['id', 'bus_number', 'capacity'],
					required: false,
				},
				{
					model: RouteAssignment,
					as: 'routeAssignments',
					attributes: ['id', 'student_id', 'pickup_latitude', 'pickup_longitude', 'pickup_order'],
					required: false,
					include: [
						{
							model: Student,
							as: 'student',
							attributes: ['id', 'full_name', 'grade', 'parent_id'],
							required: false,
						},
					],
				},
			],
		});

		if (!route) {
			throw {
				status: 404,
				code: 'ROUTE_NOT_FOUND',
				message: 'Route not found.',
			};
		}

		return route.toJSON();
	}

	/**
	 * Update route information
	 */
	static async updateRoute(id: number, input: UpdateRouteInput) {
		const route = await Route.findByPk(id);
		if (!route) {
			throw {
				status: 404,
				code: 'ROUTE_NOT_FOUND',
				message: 'Route not found.',
			};
		}

		if (input.name !== undefined) {
			const trimmed =
				typeof input.name === 'string' ? input.name.trim() : '';
			if (!trimmed) {
				throw {
					status: 400,
					code: 'INVALID_NAME',
					message: 'Route name cannot be empty.',
				};
			}
			(route as any).name = trimmed;
		}

		if (input.bus_id !== undefined) {
			const bus = await Bus.findByPk(Number(input.bus_id));
			if (!bus) {
				throw {
					status: 400,
					code: 'BUS_NOT_FOUND',
					message: 'Bus not found.',
				};
			}
			(route as any).bus_id = bus.id;
		}

		if (input.start_time !== undefined) {
			(route as any).start_time = input.start_time ?? null;
		}
		if (input.end_time !== undefined) {
			(route as any).end_time = input.end_time ?? null;
		}

		await route.save();
		return route.toJSON();
	}

	/**
	 * Delete route (and its assignments via cascade or explicit delete)
	 */
	static async deleteRoute(id: number) {
		const route = await Route.findByPk(id);
		if (!route) {
			throw {
				status: 404,
				code: 'ROUTE_NOT_FOUND',
				message: 'Route not found.',
			};
		}

		await RouteAssignment.destroy({ where: { route_id: id } });
		await route.destroy();
		return { deleted: true, id };
	}

	/**
	 * Optimize route: group students by pickup zones, order stops to minimize travel,
	 * update pickup_order on assignments, and return waypoints.
	 */
	static async optimizeRoute(
		id: number,
		options: OptimizeRouteOptions = {}
	): Promise<{
		route: any;
		waypoints: OptimizedWaypoint[];
		summary: { totalStops: number; totalStudents: number; assignmentsWithoutCoords: number };
	}> {
		const zoneRadiusKm = options.zoneRadiusKm ?? DEFAULT_ZONE_RADIUS_KM;

		const route = await Route.findByPk(id, {
			attributes: ['id', 'bus_id', 'name', 'start_time', 'end_time'],
			include: [
				{
					model: Bus,
					as: 'bus',
					attributes: ['id', 'bus_number', 'capacity'],
					required: false,
				},
				{
					model: RouteAssignment,
					as: 'routeAssignments',
					attributes: ['id', 'student_id', 'pickup_latitude', 'pickup_longitude', 'pickup_order'],
					required: false,
					include: [
						{
							model: Student,
							as: 'student',
							attributes: ['id', 'full_name', 'grade', 'parent_id'],
							required: false,
						},
					],
				},
			],
		});

		if (!route) {
			throw {
				status: 404,
				code: 'ROUTE_NOT_FOUND',
				message: 'Route not found.',
			};
		}

		const assignments = (route as any).routeAssignments ?? [];
		const withCoords = assignments.filter(
			(a: any) =>
				a.pickup_latitude != null &&
				a.pickup_longitude != null &&
				!Number.isNaN(Number(a.pickup_latitude)) &&
				!Number.isNaN(Number(a.pickup_longitude))
		);
		const withoutCoords = assignments.length - withCoords.length;

		if (withCoords.length === 0) {
			// Clear any previous pickup_order
			await RouteAssignment.update(
				{ pickup_order: null },
				{ where: { route_id: id } }
			);
			return {
				route: route.toJSON(),
				waypoints: [],
				summary: {
					totalStops: 0,
					totalStudents: assignments.length,
					assignmentsWithoutCoords: withoutCoords,
				},
			};
		}

		// Cluster by proximity: same zone if within zoneRadiusKm of cluster centroid
		const clusters: { lat: number; lon: number; assignments: any[] }[] = [];

		for (const a of withCoords) {
			const lat = Number(a.pickup_latitude);
			const lon = Number(a.pickup_longitude);
			let merged = false;
			for (const cluster of clusters) {
				const d = haversineKm(cluster.lat, cluster.lon, lat, lon);
				if (d <= zoneRadiusKm) {
					cluster.assignments.push(a);
					// Update centroid (simple average)
					const n = cluster.assignments.length;
					cluster.lat = (cluster.lat * (n - 1) + lat) / n;
					cluster.lon = (cluster.lon * (n - 1) + lon) / n;
					merged = true;
					break;
				}
			}
			if (!merged) {
				clusters.push({ lat, lon, assignments: [a] });
			}
		}

		// Merge clusters that are now close after centroid updates (second pass)
		let changed = true;
		while (changed) {
			changed = false;
			for (let i = clusters.length - 1; i >= 0; i--) {
				const c = clusters[i];
				for (let j = 0; j < i; j++) {
					const d = haversineKm(c.lat, c.lon, clusters[j].lat, clusters[j].lon);
					if (d <= zoneRadiusKm) {
						clusters[j].assignments.push(...c.assignments);
						const n = clusters[j].assignments.length;
						clusters[j].lat =
							(clusters[j].lat * (clusters[j].assignments.length - c.assignments.length) +
								c.lat * c.assignments.length) /
							n;
						clusters[j].lon =
							(clusters[j].lon * (clusters[j].assignments.length - c.assignments.length) +
								c.lon * c.assignments.length) /
							n;
						clusters.splice(i, 1);
						changed = true;
						break;
					}
				}
			}
		}

		// Order clusters by nearest-neighbor from centroid of all points (minimize travel)
		const allLat =
			clusters.reduce((s, c) => s + c.lat * c.assignments.length, 0) /
			withCoords.length;
		const allLon =
			clusters.reduce((s, c) => s + c.lon * c.assignments.length, 0) /
			withCoords.length;

		const ordered: typeof clusters = [];
		const remaining = [...clusters];

		while (remaining.length > 0) {
			const fromLat = ordered.length === 0 ? allLat : ordered[ordered.length - 1].lat;
			const fromLon = ordered.length === 0 ? allLon : ordered[ordered.length - 1].lon;
			let best = 0;
			let bestDist = Infinity;
			for (let i = 0; i < remaining.length; i++) {
				const d = haversineKm(
					fromLat,
					fromLon,
					remaining[i].lat,
					remaining[i].lon
				);
				if (d < bestDist) {
					bestDist = d;
					best = i;
				}
			}
			ordered.push(remaining[best]);
			remaining.splice(best, 1);
		}

		// Assign pickup_order and persist
		let order = 0;
		for (const cluster of ordered) {
			for (const a of cluster.assignments) {
				await RouteAssignment.update(
					{ pickup_order: order },
					{ where: { id: a.id } }
				);
				a.pickup_order = order;
			}
			order++;
		}

		const waypoints: OptimizedWaypoint[] = ordered.map((cluster, idx) => ({
			sequence: idx,
			latitude: cluster.lat,
			longitude: cluster.lon,
			students: cluster.assignments.map((a: any) => ({
				id: a.student?.id,
				full_name: a.student?.full_name,
				grade: a.student?.grade,
				parent_id: a.student?.parent_id,
			})),
			assignmentIds: cluster.assignments.map((a: any) => a.id),
		}));

		// Reload route with updated assignments for response
		const updatedRoute = await Route.findByPk(id, {
			attributes: ['id', 'bus_id', 'name', 'start_time', 'end_time'],
			include: [
				{
					model: Bus,
					as: 'bus',
					attributes: ['id', 'bus_number', 'capacity'],
					required: false,
				},
				{
					model: RouteAssignment,
					as: 'routeAssignments',
					attributes: ['id', 'student_id', 'pickup_latitude', 'pickup_longitude', 'pickup_order'],
					required: false,
					include: [
						{
							model: Student,
							as: 'student',
							attributes: ['id', 'full_name', 'grade', 'parent_id'],
							required: false,
						},
					],
				},
			],
		});

		return {
			route: updatedRoute!.toJSON(),
			waypoints,
			summary: {
				totalStops: waypoints.length,
				totalStudents: assignments.length,
				assignmentsWithoutCoords: withoutCoords,
			},
		};
	}

	/**
	 * Get realistic driving directions for a route using Google Directions API.
	 * Uses the route's ordered waypoints (by pickup_order) to get polyline, duration, and ETA-friendly legs.
	 * Optional origin/destination (e.g. depot/school) can be passed; otherwise first/last stop are used.
	 */
	static async getRouteDirections(
		id: number,
		options: GetDirectionsOptions = {}
	): Promise<{
		route: any;
		/** Ordered stop points used for the directions request. */
		waypoints: { sequence: number; latitude: number; longitude: number }[];
		/** Google Directions result (polyline, legs, ETAs). Null if API key missing or request fails. */
		directions: DirectionsResult | null;
	}> {
		const route = await Route.findByPk(id, {
			attributes: ['id', 'bus_id', 'name', 'start_time', 'end_time'],
			include: [
				{
					model: Bus,
					as: 'bus',
					attributes: ['id', 'bus_number', 'capacity'],
					required: false,
				},
				{
					model: RouteAssignment,
					as: 'routeAssignments',
					attributes: ['id', 'student_id', 'pickup_latitude', 'pickup_longitude', 'pickup_order'],
					required: false,
				},
			],
		});

		if (!route) {
			throw {
				status: 404,
				code: 'ROUTE_NOT_FOUND',
				message: 'Route not found.',
			};
		}

		const assignments = (route as any).routeAssignments ?? [];
		const withCoords = assignments
			.filter(
				(a: any) =>
					a.pickup_latitude != null &&
					a.pickup_longitude != null &&
					!Number.isNaN(Number(a.pickup_latitude)) &&
					!Number.isNaN(Number(a.pickup_longitude))
			)
			.map((a: any) => ({
				...a,
				lat: Number(a.pickup_latitude),
				lng: Number(a.pickup_longitude),
				order: a.pickup_order != null ? Number(a.pickup_order) : 9999,
			}));

		// Order by pickup_order (nulls last), then by id
		withCoords.sort((a: any, b: any) => {
			if (a.order !== b.order) return a.order - b.order;
			return (a.id ?? 0) - (b.id ?? 0);
		});

		// One waypoint per unique pickup_order (group stops)
		const orderToPoint = new Map<number, { lat: number; lng: number }>();
		for (const a of withCoords) {
			if (!orderToPoint.has(a.order)) {
				orderToPoint.set(a.order, { lat: a.lat, lng: a.lng });
			}
		}
		const sortedOrders = Array.from(orderToPoint.keys()).sort((a, b) => a - b);
		const orderedPoints: LatLng[] = sortedOrders.map((o) => orderToPoint.get(o)!);

		const waypointsForResponse = orderedPoints.map((p, idx) => ({
			sequence: idx,
			latitude: p.lat,
			longitude: p.lng,
		}));

		if (orderedPoints.length === 0) {
			return {
				route: route.toJSON(),
				waypoints: [],
				directions: null,
			};
		}

		const origin = options.origin ?? orderedPoints[0];
		const destination = options.destination ?? orderedPoints[orderedPoints.length - 1];
		const middleWaypoints =
			orderedPoints.length <= 2
				? []
				: orderedPoints.slice(1, orderedPoints.length - 1);

		const directions = await getDirections(origin, destination, middleWaypoints);

		return {
			route: route.toJSON(),
			waypoints: waypointsForResponse,
			directions,
		};
	}
}
