/**
 * Geofence utility functions using Haversine formula
 * Calculates distances between GPS coordinates on Earth's surface
 */

const EARTH_RADIUS_METERS = 6371000; // Earth's radius in meters

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
	return degrees * (Math.PI / 180);
}

/**
 * Calculate the distance between two GPS coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lng1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lng2 Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number
): number {
	const dLat = toRadians(lat2 - lat1);
	const dLng = toRadians(lng2 - lng1);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRadians(lat1)) *
			Math.cos(toRadians(lat2)) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const distance = EARTH_RADIUS_METERS * c;

	return distance;
}

/**
 * Check if a point is within a geofence (circular radius)
 * @param pointLat Latitude of the point to check
 * @param pointLng Longitude of the point to check
 * @param geofenceLat Latitude of geofence center
 * @param geofenceLng Longitude of geofence center
 * @param radiusMeters Radius of geofence in meters
 * @returns true if point is within geofence, false otherwise
 */
export function isWithinGeofence(
	pointLat: number,
	pointLng: number,
	geofenceLat: number,
	geofenceLng: number,
	radiusMeters: number
): boolean {
	const distance = calculateDistance(
		pointLat,
		pointLng,
		geofenceLat,
		geofenceLng
	);
	return distance <= radiusMeters;
}

/**
 * Geofence interface for type safety
 */
export interface GeofenceData {
	id: number;
	type: 'school' | 'home';
	latitude: number;
	longitude: number;
	radius_meters: number;
	student_id?: number;
	bus_id?: number;
}

/**
 * Find which geofence a point is within
 * @param lat Latitude of the point
 * @param lng Longitude of the point
 * @param geofences Array of geofences to check
 * @returns The matching geofence or null if none match
 */
export function findMatchingGeofence(
	lat: number,
	lng: number,
	geofences: GeofenceData[]
): GeofenceData | null {
	for (const geofence of geofences) {
		if (
			isWithinGeofence(
				lat,
				lng,
				Number(geofence.latitude),
				Number(geofence.longitude),
				geofence.radius_meters || 50
			)
		) {
			return geofence;
		}
	}
	return null;
}

