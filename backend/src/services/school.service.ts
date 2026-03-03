import { db } from '../../models';
const { School, Bus } = db;

// Note: School model does not declare HasMany(Bus) to avoid circular imports.
// We query buses by school_id where needed.

export interface CreateSchoolInput {
	name: string;
	address?: string | null;
	latitude?: number | null;
	longitude?: number | null;
}

export interface UpdateSchoolInput {
	name?: string;
	address?: string | null;
	latitude?: number | null;
	longitude?: number | null;
}

export class SchoolService {
	/**
	 * Create a new school
	 */
	static async createSchool(input: CreateSchoolInput) {
		if (!input.name || typeof input.name !== 'string' || !input.name.trim()) {
			throw {
				status: 400,
				code: 'MISSING_NAME',
				message: 'School name is required.',
			};
		}

		if (input.latitude !== undefined && input.latitude !== null) {
			const lat = Number(input.latitude);
			if (Number.isNaN(lat) || lat < -90 || lat > 90) {
				throw {
					status: 400,
					code: 'INVALID_LATITUDE',
					message: 'Latitude must be between -90 and 90.',
				};
			}
		}

		if (input.longitude !== undefined && input.longitude !== null) {
			const lng = Number(input.longitude);
			if (Number.isNaN(lng) || lng < -180 || lng > 180) {
				throw {
					status: 400,
					code: 'INVALID_LONGITUDE',
					message: 'Longitude must be between -180 and 180.',
				};
			}
		}

		const school = await School.create({
			name: input.name.trim(),
			address: input.address?.trim() || null,
			latitude: input.latitude != null ? Number(input.latitude) : null,
			longitude: input.longitude != null ? Number(input.longitude) : null,
		});

		return school.toJSON();
	}

	/**
	 * Get all schools
	 */
	static async getAllSchools() {
		const schools = await School.findAll({
			attributes: ['id', 'name', 'address', 'latitude', 'longitude'],
			order: [['name', 'ASC']],
		});
		return schools.map((s) => s.toJSON());
	}

	/**
	 * Get school by ID with buses that belong to this school
	 */
	static async getSchoolById(id: number) {
		const school = await School.findByPk(id, {
			attributes: ['id', 'name', 'address', 'latitude', 'longitude'],
		});

		if (!school) {
			throw {
				status: 404,
				code: 'SCHOOL_NOT_FOUND',
				message: 'School not found.',
			};
		}

		const buses = await Bus.findAll({
			where: { school_id: id },
			attributes: ['id', 'bus_number'],
		});

		const payload = school.toJSON() as any;
		payload.buses = buses.map((b) => b.toJSON());
		return payload;
	}

	/**
	 * Update school
	 */
	static async updateSchool(id: number, input: UpdateSchoolInput) {
		const school = await School.findByPk(id);
		if (!school) {
			throw {
				status: 404,
				code: 'SCHOOL_NOT_FOUND',
				message: 'School not found.',
			};
		}

		if (input.name !== undefined) {
			const trimmed = typeof input.name === 'string' ? input.name.trim() : '';
			if (!trimmed) {
				throw {
					status: 400,
					code: 'INVALID_NAME',
					message: 'School name cannot be empty.',
				};
			}
			(school as any).name = trimmed;
		}
		if (input.address !== undefined) (school as any).address = input.address?.trim() || null;
		if (input.latitude !== undefined) {
			if (input.latitude === null) (school as any).latitude = null;
			else {
				const lat = Number(input.latitude);
				if (Number.isNaN(lat) || lat < -90 || lat > 90) {
					throw { status: 400, code: 'INVALID_LATITUDE', message: 'Latitude must be between -90 and 90.' };
				}
				(school as any).latitude = lat;
			}
		}
		if (input.longitude !== undefined) {
			if (input.longitude === null) (school as any).longitude = null;
			else {
				const lng = Number(input.longitude);
				if (Number.isNaN(lng) || lng < -180 || lng > 180) {
					throw { status: 400, code: 'INVALID_LONGITUDE', message: 'Longitude must be between -180 and 180.' };
				}
				(school as any).longitude = lng;
			}
		}
		await school.save();
		return school.toJSON();
	}

	/**
	 * Delete school (hard delete). Buses' school_id will be set to null (SET NULL).
	 */
	static async deleteSchool(id: number) {
		const school = await School.findByPk(id);
		if (!school) {
			throw {
				status: 404,
				code: 'SCHOOL_NOT_FOUND',
				message: 'School not found.',
			};
		}
		await school.destroy();
		return { deleted: true, id };
	}
}
