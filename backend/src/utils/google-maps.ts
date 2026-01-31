import axios from 'axios';

/**
 * Google Maps API utility for geocoding, coordinate validation, and directions
 */

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_API_BASE_URL = 'https://maps.googleapis.com/maps/api';

/** Max waypoints allowed by Google Directions API (origin + waypoints + destination). */
const DIRECTIONS_MAX_WAYPOINTS = 25;

export interface GeocodeResult {
	latitude: number;
	longitude: number;
	formattedAddress: string;
	placeId?: string;
}

export interface GeocodeError {
	code: string;
	message: string;
}

/**
 * Validate coordinates using Google Maps Geocoding API
 * This ensures coordinates are valid and correspond to a real location
 */
export async function validateCoordinates(
	latitude: number,
	longitude: number
): Promise<{ valid: boolean; address?: string; error?: string }> {
	if (!GOOGLE_MAPS_API_KEY) {
		console.warn('GOOGLE_MAPS_API_KEY not set, skipping coordinate validation');
		// Basic validation only
		if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
			return { valid: false, error: 'Invalid coordinate range' };
		}
		return { valid: true };
	}

	try {
		const response = await axios.get(`${GOOGLE_MAPS_API_BASE_URL}/geocode/json`, {
			params: {
				latlng: `${latitude},${longitude}`,
				key: GOOGLE_MAPS_API_KEY,
			},
		});

		if (response.data.status === 'OK' && response.data.results.length > 0) {
			return {
				valid: true,
				address: response.data.results[0].formatted_address,
			};
		} else if (response.data.status === 'ZERO_RESULTS') {
			return {
				valid: false,
				error: 'Coordinates do not correspond to a valid location',
			};
		} else {
			return {
				valid: false,
				error: `Geocoding API error: ${response.data.status}`,
			};
		}
	} catch (error: any) {
		console.error('Google Maps API error:', error);
		// Fallback to basic validation
		if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
			return { valid: false, error: 'Invalid coordinate range' };
		}
		return { valid: true };
	}
}

/**
 * Geocode an address to get coordinates
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
	if (!GOOGLE_MAPS_API_KEY) {
		console.warn('GOOGLE_MAPS_API_KEY not set, geocoding unavailable');
		return null;
	}

	try {
		const response = await axios.get(`${GOOGLE_MAPS_API_BASE_URL}/geocode/json`, {
			params: {
				address: address,
				key: GOOGLE_MAPS_API_KEY,
			},
		});

		if (response.data.status === 'OK' && response.data.results.length > 0) {
			const result = response.data.results[0];
			const location = result.geometry.location;

			return {
				latitude: location.lat,
				longitude: location.lng,
				formattedAddress: result.formatted_address,
				placeId: result.place_id,
			};
		}

		return null;
	} catch (error: any) {
		console.error('Geocoding error:', error);
		return null;
	}
}

/**
 * Reverse geocode coordinates to get address
 */
export async function reverseGeocode(
	latitude: number,
	longitude: number
): Promise<string | null> {
	if (!GOOGLE_MAPS_API_KEY) {
		console.warn('GOOGLE_MAPS_API_KEY not set, reverse geocoding unavailable');
		return null;
	}

	try {
		const response = await axios.get(`${GOOGLE_MAPS_API_BASE_URL}/geocode/json`, {
			params: {
				latlng: `${latitude},${longitude}`,
				key: GOOGLE_MAPS_API_KEY,
			},
		});

		if (response.data.status === 'OK' && response.data.results.length > 0) {
			return response.data.results[0].formatted_address;
		}

		return null;
	} catch (error: any) {
		console.error('Reverse geocoding error:', error);
		return null;
	}
}

// --- Directions API (for route polyline and ETAs) ---

export interface LatLng {
	lat: number;
	lng: number;
}

export interface DirectionsLeg {
	/** Duration in seconds. */
	durationSeconds: number;
	/** Human-readable duration (e.g. "5 mins"). */
	durationText: string;
	/** Distance in meters. */
	distanceMeters: number;
	/** Human-readable distance (e.g. "2.3 km"). */
	distanceText: string;
	/** Seconds from route start to the beginning of this leg (for ETA: startTime + startOffsetSeconds). */
	startOffsetSeconds: number;
	/** Waypoint index this leg goes to (1-based: leg 0 is origin → waypoint 0). */
	toWaypointIndex: number;
}

export interface DirectionsResult {
	/** Encoded polyline for map display (e.g. Google Maps JS decode). */
	polyline: string;
	/** Total duration in seconds. */
	totalDurationSeconds: number;
	/** Total distance in meters. */
	totalDistanceMeters: number;
	/** Human-readable total duration/distance. */
	totalDurationText: string;
	totalDistanceText: string;
	/** Per-leg duration, distance, and offset for ETAs. */
	legs: DirectionsLeg[];
}

/**
 * Get driving directions from Google Directions API for an ordered list of points.
 * Use this with the route's ordered waypoints to get a realistic polyline and durations for display and ETAs.
 *
 * @param origin - Start point (e.g. depot or first stop).
 * @param destination - End point (e.g. school or last stop).
 * @param waypoints - Middle stops in order (optional). Google allows max 23 waypoints per request.
 * @returns Directions result with polyline and legs, or null if API key missing or request fails.
 */
export async function getDirections(
	origin: LatLng,
	destination: LatLng,
	waypoints: LatLng[] = []
): Promise<DirectionsResult | null> {
	if (!GOOGLE_MAPS_API_KEY?.trim()) {
		console.warn('GOOGLE_MAPS_API_KEY not set, directions unavailable');
		return null;
	}

	const totalStops = 2 + waypoints.length; // origin + waypoints + destination
	if (totalStops > DIRECTIONS_MAX_WAYPOINTS) {
		console.warn(
			`Directions API supports max ${DIRECTIONS_MAX_WAYPOINTS} waypoints, got ${totalStops}. Truncating.`
		);
		waypoints = waypoints.slice(0, DIRECTIONS_MAX_WAYPOINTS - 2);
	}

	try {
		const params: Record<string, string> = {
			origin: `${origin.lat},${origin.lng}`,
			destination: `${destination.lat},${destination.lng}`,
			key: GOOGLE_MAPS_API_KEY,
		};
		if (waypoints.length > 0) {
			params.waypoints = waypoints.map((w) => `${w.lat},${w.lng}`).join('|');
		}

		const response = await axios.get(
			`${GOOGLE_MAPS_API_BASE_URL}/directions/json`,
			{ params, timeout: 15000 }
		);

		const data = response.data;
		if (data.status !== 'OK' || !data.routes?.length) {
			console.warn('Directions API non-OK:', data.status, data.error_message);
			return null;
		}

		const route = data.routes[0];
		const legs = route.legs || [];
		const overviewPolyline = route.overview_polyline?.points || '';

		let totalDurationSeconds = 0;
		let totalDistanceMeters = 0;
		const resultLegs: DirectionsLeg[] = [];
		let startOffsetSeconds = 0;

		for (let i = 0; i < legs.length; i++) {
			const leg = legs[i];
			const durationSec = leg.duration?.value ?? 0;
			const distanceM = leg.distance?.value ?? 0;
			totalDurationSeconds += durationSec;
			totalDistanceMeters += distanceM;
			resultLegs.push({
				durationSeconds: durationSec,
				durationText: leg.duration?.text ?? '',
				distanceMeters: distanceM,
				distanceText: leg.distance?.text ?? '',
				startOffsetSeconds,
				toWaypointIndex: i + 1, // leg 0 = origin → first waypoint
			});
			startOffsetSeconds += durationSec;
		}

		// Human-readable totals (Google doesn't return these; approximate from last leg or sum)
		const totalDurationText =
			legs.length > 0 && legs[legs.length - 1].duration?.text
				? formatTotalDuration(totalDurationSeconds)
				: '';
		const totalDistanceText =
			legs.length > 0 && legs[legs.length - 1].distance?.text
				? formatTotalDistance(totalDistanceMeters)
				: '';

		return {
			polyline: overviewPolyline,
			totalDurationSeconds,
			totalDistanceMeters,
			totalDurationText,
			totalDistanceText,
			legs: resultLegs,
		};
	} catch (error: any) {
		console.error('Directions API error:', error?.response?.data ?? error.message);
		return null;
	}
}

function formatTotalDuration(seconds: number): string {
	if (seconds < 60) return `${seconds} secs`;
	const mins = Math.round(seconds / 60);
	if (mins < 60) return `${mins} mins`;
	const h = Math.floor(mins / 60);
	const m = mins % 60;
	return m > 0 ? `${h} hr ${m} mins` : `${h} hr`;
}

function formatTotalDistance(meters: number): string {
	if (meters < 1000) return `${meters} m`;
	return `${(meters / 1000).toFixed(1)} km`;
}
