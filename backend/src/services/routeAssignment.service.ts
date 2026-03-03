import { db } from '../../models';
const { RouteAssignment, Route, Student } = db;

export interface CreateRouteAssignmentInput {
	route_id: number;
	student_id: number;
	pickup_latitude?: number;
	pickup_longitude?: number;
}

export class RouteAssignmentService {
	/**
	 * Assign a student to a route with optional pickup coordinates.
	 * Validates route exists, student exists, and student is not already assigned to this route.
	 */
	static async createRouteAssignment(input: CreateRouteAssignmentInput) {
		const { route_id, student_id, pickup_latitude, pickup_longitude } = input;

		const routeId = Number(route_id);
		const studentId = Number(student_id);
		if (Number.isNaN(routeId) || Number.isNaN(studentId)) {
			throw {
				status: 400,
				code: 'INVALID_IDS',
				message: 'route_id and student_id are required and must be valid numbers.',
			};
		}

		const route = await Route.findByPk(routeId);
		if (!route) {
			throw {
				status: 404,
				code: 'ROUTE_NOT_FOUND',
				message: 'Route not found.',
			};
		}

		const student = await Student.findByPk(studentId);
		if (!student) {
			throw {
				status: 404,
				code: 'STUDENT_NOT_FOUND',
				message: 'Student not found.',
			};
		}

		const existing = await RouteAssignment.findOne({
			where: { route_id: routeId, student_id: studentId },
		});
		if (existing) {
			throw {
				status: 400,
				code: 'STUDENT_ALREADY_ASSIGNED',
				message: 'Student is already assigned to this route.',
			};
		}

		const assignment = await RouteAssignment.create({
			route_id: routeId,
			student_id: studentId,
			pickup_latitude:
				pickup_latitude != null && !Number.isNaN(Number(pickup_latitude))
					? Number(pickup_latitude)
					: undefined,
			pickup_longitude:
				pickup_longitude != null && !Number.isNaN(Number(pickup_longitude))
					? Number(pickup_longitude)
					: undefined,
		});

		const withStudent = await RouteAssignment.findByPk(assignment.id, {
			attributes: ['id', 'route_id', 'student_id', 'pickup_latitude', 'pickup_longitude', 'pickup_order'],
			include: [
				{
					model: Student,
					as: 'student',
					attributes: ['id', 'full_name', 'grade', 'parent_id'],
					required: false,
				},
			],
		});

		return withStudent!.toJSON();
	}

	/**
	 * Get all students assigned to a route, including pickup locations.
	 */
	static async getAssignmentsByRouteId(routeId: number) {
		const id = Number(routeId);
		if (Number.isNaN(id)) {
			throw {
				status: 400,
				code: 'INVALID_ROUTE_ID',
				message: 'routeId must be a valid number.',
			};
		}

		const route = await Route.findByPk(id);
		if (!route) {
			throw {
				status: 404,
				code: 'ROUTE_NOT_FOUND',
				message: 'Route not found.',
			};
		}

		const assignments = await RouteAssignment.findAll({
			where: { route_id: id },
			attributes: ['id', 'route_id', 'student_id', 'pickup_latitude', 'pickup_longitude', 'pickup_order'],
			order: [
				['pickup_order', 'ASC NULLS LAST'],
				['id', 'ASC'],
			],
			include: [
				{
					model: Student,
					as: 'student',
					attributes: ['id', 'full_name', 'grade', 'parent_id'],
					required: false,
				},
			],
		});

		return assignments.map((a) => a.toJSON());
	}

	/**
	 * Remove a student from a route (delete assignment by id).
	 */
	static async deleteRouteAssignment(id: number) {
		const assignmentId = Number(id);
		if (Number.isNaN(assignmentId)) {
			throw {
				status: 400,
				code: 'INVALID_ID',
				message: 'Assignment id must be a valid number.',
			};
		}

		const assignment = await RouteAssignment.findByPk(assignmentId);
		if (!assignment) {
			throw {
				status: 404,
				code: 'ASSIGNMENT_NOT_FOUND',
				message: 'Route assignment not found.',
			};
		}

		await assignment.destroy();
		return { deleted: true, id: assignmentId };
	}
}
