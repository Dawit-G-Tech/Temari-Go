import { db } from '../../models';
const { DriverFeedback, DriverRating, User, Student, RouteAssignment, Route, Bus, Role } = db;
import { Op } from 'sequelize';

export interface DriverFeedbackInput {
	driver_id: number;
	parent_id: number;
	rating: number;
	comment?: string;
}

export interface DriverFeedbackResult {
	success: boolean;
	feedbackId: number;
	message: string;
}

export class DriverFeedbackService {
	/**
	 * Submit driver feedback from parent
	 * Validates that parent has a student assigned to the driver's bus
	 */
	static async submitFeedback(input: DriverFeedbackInput): Promise<DriverFeedbackResult> {
		// 1. Validate rating
		if (input.rating === undefined || input.rating === null) {
			throw {
				status: 400,
				code: 'MISSING_RATING',
				message: 'rating is required.',
			};
		}

		if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
			throw {
				status: 400,
				code: 'INVALID_RATING',
				message: 'rating must be an integer between 1 and 5.',
			};
		}

		// 2. Validate driver exists and is a driver
		const driverRole = await Role.findOne({ where: { name: 'driver' } });
		if (!driverRole) {
			throw {
				status: 500,
				code: 'ROLE_NOT_FOUND',
				message: 'Driver role not found in system.',
			};
		}

		const driver = await User.findOne({
			where: {
				id: input.driver_id,
				roleId: driverRole.id,
			},
		});

		if (!driver) {
			throw {
				status: 404,
				code: 'DRIVER_NOT_FOUND',
				message: 'Driver not found.',
			};
		}

		// 3. Validate parent exists and is a parent
		const parentRole = await Role.findOne({ where: { name: 'parent' } });
		if (!parentRole) {
			throw {
				status: 500,
				code: 'ROLE_NOT_FOUND',
				message: 'Parent role not found in system.',
			};
		}

		const parent = await User.findOne({
			where: {
				id: input.parent_id,
				roleId: parentRole.id,
			},
		});

		if (!parent) {
			throw {
				status: 404,
				code: 'PARENT_NOT_FOUND',
				message: 'Parent not found.',
			};
		}

		// 4. Validate that parent has a student assigned to the driver's bus
		await this.validateParentStudentAssignment(input.parent_id, input.driver_id);

		// 5. Create feedback record
		const feedback = await DriverFeedback.create({
			driver_id: input.driver_id,
			parent_id: input.parent_id,
			rating: input.rating,
			comment: input.comment || null,
			timestamp: new Date(),
		});

		// Note: Driver ratings are recalculated automatically at the end of each month via cron job

		return {
			success: true,
			feedbackId: feedback.id,
			message: 'Driver feedback submitted successfully.',
		};
	}

	/**
	 * Validate that parent has a student assigned to the driver's bus
	 */
	private static async validateParentStudentAssignment(
		parentId: number,
		driverId: number
	): Promise<void> {
		// Find all buses assigned to this driver
		const buses = await Bus.findAll({
			where: {
				driver_id: driverId,
			},
		});

		if (buses.length === 0) {
			throw {
				status: 400,
				code: 'DRIVER_NO_BUS',
				message: 'Driver is not assigned to any bus.',
			};
		}

		const busIds = buses.map((bus) => bus.id);

		// Find all routes for these buses
		const routes = await Route.findAll({
			where: {
				bus_id: {
					[Op.in]: busIds,
				},
			},
		});

		if (routes.length === 0) {
			throw {
				status: 400,
				code: 'NO_STUDENT_ASSIGNMENT',
				message: 'You do not have any students assigned to this driver\'s bus.',
			};
		}

		const routeIds = routes.map((route) => route.id);

		// Find students belonging to this parent
		const students = await Student.findAll({
			where: {
				parent_id: parentId,
			},
		});

		if (students.length === 0) {
			throw {
				status: 400,
				code: 'NO_STUDENTS',
				message: 'You do not have any students.',
			};
		}

		const studentIds = students.map((student) => student.id);

		// Check if any of the parent's students are assigned to any of the driver's routes
		const assignment = await RouteAssignment.findOne({
			where: {
				route_id: {
					[Op.in]: routeIds,
				},
				student_id: {
					[Op.in]: studentIds,
				},
			},
		});

		if (!assignment) {
			throw {
				status: 403,
				code: 'NO_STUDENT_ASSIGNMENT',
				message: 'You do not have any students assigned to this driver\'s bus.',
			};
		}
	}

	/**
	 * Recalculate driver rating based on all feedback
	 * Updates the parental_feedback_score in driver_ratings table
	 */
	private static async recalculateDriverRating(driverId: number): Promise<void> {
		try {
			// Get all feedback for this driver
			const allFeedback = await DriverFeedback.findAll({
				where: {
					driver_id: driverId,
					rating: {
						[Op.ne]: null,
					},
				},
			});

			if (allFeedback.length === 0) {
				// No feedback yet, set score to 0
				await this.updateDriverRating(driverId, 0);
				return;
			}

			// Calculate average rating
			const totalRating = allFeedback.reduce((sum, feedback) => {
				return sum + (feedback.rating || 0);
			}, 0);

			const averageRating = totalRating / allFeedback.length;

			// Update driver rating (scale to 0-100 if needed, or keep as 1-5)
			// Assuming we store as 1-5 scale
			await this.updateDriverRating(driverId, averageRating);
		} catch (error) {
			console.error('Error recalculating driver rating:', error);
			// Don't throw - rating recalculation failure shouldn't break feedback submission
		}
	}

	/**
	 * Update or create driver rating record
	 */
	private static async updateDriverRating(driverId: number, parentalFeedbackScore: number): Promise<void> {
		// Get current period (e.g., current month)
		const now = new Date();
		const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

		// Find or create rating record for current period
		const [rating, created] = await DriverRating.findOrCreate({
			where: {
				driver_id: driverId,
				period_start: periodStart,
				period_end: periodEnd,
			},
			defaults: {
				driver_id: driverId,
				parental_feedback_score: parentalFeedbackScore,
				period_start: periodStart,
				period_end: periodEnd,
			},
		});

		// Update parental feedback score
		await rating.update({
			parental_feedback_score: Number(parentalFeedbackScore.toFixed(2)),
		});
	}

	/**
	 * Get feedback history for a driver
	 */
	static async getDriverFeedback(driverId: number, limit?: number) {
		return await DriverFeedback.findAll({
			where: {
				driver_id: driverId,
			},
			include: [
				{
					model: User,
					as: 'parent',
					attributes: ['id', 'name', 'email'],
				},
			],
			order: [['timestamp', 'DESC']],
			limit: limit || 50,
		});
	}

	/**
	 * Get feedback given by a parent
	 */
	static async getParentFeedback(parentId: number, limit?: number) {
		return await DriverFeedback.findAll({
			where: {
				parent_id: parentId,
			},
			include: [
				{
					model: User,
					as: 'driver',
					attributes: ['id', 'name', 'email'],
				},
			],
			order: [['timestamp', 'DESC']],
			limit: limit || 50,
		});
	}
}
