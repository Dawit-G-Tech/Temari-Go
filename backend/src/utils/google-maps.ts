import axios from 'axios';

/**
 * Google Maps API utility for geocoding and coordinate validation
 */

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_API_BASE_URL = 'https://maps.googleapis.com/maps/api';

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
