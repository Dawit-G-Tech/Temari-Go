import { db } from '../../models';
const {
	DriverRating,
	DriverFeedback,
	AlcoholTest,
	Location,
	Bus,
	Route,
	RouteAssignment,
	Student,
	Attendance,
	Role,
	User,
} = db;
import { Op } from 'sequelize';

/**
 * Weight configuration for driver rating calculation
 */
const WEIGHTS = {
	SAFETY_COMPLIANCE: 0.4, // 40%
	PARENTAL_FEEDBACK: 0.35, // 35%
	OPERATIONAL_PERFORMANCE: 0.25, // 25%
};

/**
 * Penalty points for violations
 */
const PENALTIES = {
	ALCOHOL_VIOLATION: 20, // Points deducted per failed alcohol test
	SPEED_VIOLATION: 5, // Points deducted per speed violation
	MISSED_PICKUP: 10, // Points deducted per missed pickup
	PUNCTUALITY_DELAY_MINUTES: 0.5, // Points deducted per minute of delay
};

/**
 * Maximum score (starting point before deductions)
 */
const MAX_SCORE = 100;

/**
 * Service for calculating and updating driver ratings
 *
 * Important design choice:
 * - This service is **pure** with respect to time periods.
 * - Callers (cron/schedulers) decide *which* period to calculate for and pass
 *   explicit `periodStart` and `periodEnd` dates into these methods.
 */
export class DriverRatingService {
	/**
	 * Calculate comprehensive driver rating for a specific period
	 * @param driverId Driver ID
	 * @param periodStart Start date of the rating period
	 * @param periodEnd End date of the rating period
	 */
	static async calculateDriverRating(
		driverId: number,
		periodStart: Date,
		periodEnd: Date
	): Promise<any> {
		// Ensure periodEnd is end of day
		const periodEndDate = new Date(periodEnd);
		periodEndDate.setHours(23, 59, 59, 999);

		// Calculate individual scores
		const safetyScore = await this.calculateSafetyComplianceScore(
			driverId,
			periodStart,
			periodEndDate
		);
		const parentalScore = await this.calculateParentalFeedbackScore(
			driverId,
			periodStart,
			periodEndDate
		);
		const operationalScore = await this.calculateOperationalPerformanceScore(
			driverId,
			periodStart,
			periodEndDate
		);

		// Calculate weighted overall score
		const overallScore =
			safetyScore * WEIGHTS.SAFETY_COMPLIANCE +
			parentalScore * WEIGHTS.PARENTAL_FEEDBACK +
			operationalScore * WEIGHTS.OPERATIONAL_PERFORMANCE;

		// Get missed pickups count
		const missedPickups = await this.countMissedPickups(
			driverId,
			periodStart,
			periodEndDate
		);

		// Find or create rating record
		const [rating, created] = await DriverRating.findOrCreate({
			where: {
				driver_id: driverId,
				period_start: periodStart,
				period_end: periodEnd,
			},
			defaults: {
				driver_id: driverId,
				safety_compliance_score: safetyScore,
				parental_feedback_score: parentalScore,
				operational_performance_score: operationalScore,
				overall_score: overallScore,
				missed_pickups: missedPickups,
				period_start: periodStart,
				period_end: periodEnd,
			},
		});

		// Update rating record
		await rating.update({
			safety_compliance_score: Number(safetyScore.toFixed(2)),
			parental_feedback_score: Number(parentalScore.toFixed(2)),
			operational_performance_score: Number(operationalScore.toFixed(2)),
			overall_score: Number(overallScore.toFixed(2)),
			missed_pickups: missedPickups,
		});

		return rating;
	}

	/**
	 * Calculate Safety Compliance Score (40% weight)
	 * Based on alcohol violations and speed violations
	 * Normalized to 0-100 scale
	 */
	private static async calculateSafetyComplianceScore(
		driverId: number,
		periodStart: Date,
		periodEnd: Date
	): Promise<number> {
		// Get all buses assigned to this driver
		const buses = await Bus.findAll({
			where: {
				driver_id: driverId,
			},
		});

		if (buses.length === 0) {
			return 0; // No bus assigned, cannot calculate score
		}

		const busIds = buses.map((bus) => bus.id);

		// Count alcohol violations (failed tests)
		const alcoholViolations = await AlcoholTest.count({
			where: {
				driver_id: driverId,
				passed: false,
				timestamp: {
					[Op.between]: [periodStart, periodEnd],
				},
			},
		});

		// Count speed violations
		// Get speed limit from environment or use default
		const DEFAULT_SPEED_LIMIT = 60;
		const SPEED_LIMIT = Number(process.env.SPEED_LIMIT_KMH) || DEFAULT_SPEED_LIMIT;

		const speedViolations = await Location.count({
			where: {
				bus_id: {
					[Op.in]: busIds,
				},
				speed: {
					[Op.gt]: SPEED_LIMIT,
				},
				timestamp: {
					[Op.between]: [periodStart, periodEnd],
				},
			},
		});

		// Calculate penalty points
		const alcoholPenalty = alcoholViolations * PENALTIES.ALCOHOL_VIOLATION;
		const speedPenalty = speedViolations * PENALTIES.SPEED_VIOLATION;
		const totalPenalty = alcoholPenalty + speedPenalty;

		// Calculate score (max 100, deduct penalties, minimum 0)
		const score = Math.max(0, MAX_SCORE - totalPenalty);

		return score;
	}

	/**
	 * Calculate Parental Feedback Score (35% weight)
	 * Based on average star rating from parent feedback
	 * Normalized to 0-100 scale (1-5 star rating * 20)
	 */
	private static async calculateParentalFeedbackScore(
		driverId: number,
		periodStart: Date,
		periodEnd: Date
	): Promise<number> {
		// Get all feedback for this driver in the period
		const feedbacks = await DriverFeedback.findAll({
			where: {
				driver_id: driverId,
				rating: {
					[Op.ne]: null,
				},
				timestamp: {
					[Op.between]: [periodStart, periodEnd],
				},
			},
		});

		if (feedbacks.length === 0) {
			return 0; // No feedback, return 0
		}

		// Calculate average rating
		const totalRating = feedbacks.reduce((sum, feedback) => {
			return sum + (feedback.rating || 0);
		}, 0);

		const averageRating = totalRating / feedbacks.length;

		// Convert 1-5 scale to 0-100 scale (multiply by 20)
		const score = averageRating * 20;

		return Math.min(100, Math.max(0, score)); // Ensure between 0-100
	}

	/**
	 * Calculate Operational Performance Score (25% weight)
	 * Based on missed pickups and punctuality
	 * Normalized to 0-100 scale
	 */
	private static async calculateOperationalPerformanceScore(
		driverId: number,
		periodStart: Date,
		periodEnd: Date
	): Promise<number> {
		// Get all buses assigned to this driver
		const buses = await Bus.findAll({
			where: {
				driver_id: driverId,
			},
		});

		if (buses.length === 0) {
			return 0; // No bus assigned, cannot calculate score
		}

		const busIds = buses.map((bus) => bus.id);

		// Count missed pickups
		const missedPickups = await this.countMissedPickups(driverId, periodStart, periodEnd);

		// Calculate punctuality score
		const punctualityScore = await this.calculatePunctualityScore(
			busIds,
			periodStart,
			periodEnd
		);

		// Calculate penalty for missed pickups
		const missedPickupPenalty = missedPickups * PENALTIES.MISSED_PICKUP;

		// Start with punctuality score, deduct missed pickup penalties
		const score = Math.max(0, punctualityScore - missedPickupPenalty);

		return Math.min(100, Math.max(0, score)); // Ensure between 0-100
	}

	/**
	 * Count missed pickups for a driver
	 * A missed pickup is when a student assigned to a route doesn't board on a scheduled day
	 */
	private static async countMissedPickups(
		driverId: number,
		periodStart: Date,
		periodEnd: Date
	): Promise<number> {
		// Get all buses assigned to this driver
		const buses = await Bus.findAll({
			where: {
				driver_id: driverId,
			},
		});

		if (buses.length === 0) {
			return 0;
		}

		const busIds = buses.map((bus) => bus.id);

		// Get all routes for these buses
		const routes = await Route.findAll({
			where: {
				bus_id: {
					[Op.in]: busIds,
				},
			},
		});

		if (routes.length === 0) {
			return 0;
		}

		const routeIds = routes.map((route) => route.id);

		// Get all students assigned to these routes
		const routeAssignments = await RouteAssignment.findAll({
			where: {
				route_id: {
					[Op.in]: routeIds,
				},
			},
		});

		if (routeAssignments.length === 0) {
			return 0;
		}

		// Generate list of expected boarding days (each day in the period)
		const expectedDays: Date[] = [];
		const currentDate = new Date(periodStart);
		while (currentDate <= periodEnd) {
			expectedDays.push(new Date(currentDate));
			currentDate.setDate(currentDate.getDate() + 1);
		}

		let totalMissedPickups = 0;

		// For each student-route assignment, check if they boarded each day
		for (const assignment of routeAssignments) {
			const studentId = assignment.student_id;
			const route = routes.find((r) => r.id === assignment.route_id);
			if (!route) continue;

			const busId = route.bus_id;

			// Check each day in the period
			for (const day of expectedDays) {
				const startOfDay = new Date(day);
				startOfDay.setHours(0, 0, 0, 0);
				const endOfDay = new Date(day);
				endOfDay.setHours(23, 59, 59, 999);

				// Check if student boarded on this day
				const boardingRecord = await Attendance.findOne({
					where: {
						student_id: studentId,
						bus_id: busId,
						type: 'boarding',
						timestamp: {
							[Op.between]: [startOfDay, endOfDay],
						},
					},
				});

				// If no boarding record found, it's a missed pickup
				if (!boardingRecord) {
					totalMissedPickups++;
				}
			}
		}

		return totalMissedPickups;
	}

	/**
	 * Calculate punctuality score based on route start times vs actual boarding times
	 * Returns score between 0-100
	 */
	private static async calculatePunctualityScore(
		busIds: number[],
		periodStart: Date,
		periodEnd: Date
	): Promise<number> {
		// Get all routes for these buses
		const routes = await Route.findAll({
			where: {
				bus_id: {
					[Op.in]: busIds,
				},
			},
		});

		if (routes.length === 0) {
			return 100; // No routes, perfect score
		}

		// Get all boarding records in the period
		const boardingRecords = await Attendance.findAll({
			where: {
				bus_id: {
					[Op.in]: busIds,
				},
				type: 'boarding',
				timestamp: {
					[Op.between]: [periodStart, periodEnd],
				},
			},
			order: [['timestamp', 'ASC']],
		});

		if (boardingRecords.length === 0) {
			return 0; // No boarding records, cannot assess punctuality
		}

		let totalDelayMinutes = 0;
		let assessedDays = 0;

		// Group boarding records by date and bus
		const recordsByDateAndBus = new Map<string, any[]>();
		boardingRecords.forEach((record) => {
			const date = new Date(record.timestamp);
			date.setHours(0, 0, 0, 0);
			const key = `${date.toISOString()}_${record.bus_id}`;
			if (!recordsByDateAndBus.has(key)) {
				recordsByDateAndBus.set(key, []);
			}
			recordsByDateAndBus.get(key)!.push(record);
		});

		// For each day-bus combination, find the route and compare times
		for (const [key, records] of recordsByDateAndBus.entries()) {
			const [dateStr, busIdStr] = key.split('_');
			const busId = Number(busIdStr);

			// Find route for this bus
			const route = routes.find((r) => r.bus_id === busId);
			if (!route || !route.start_time) {
				continue; // No scheduled time, skip
			}

			// Get first boarding time of the day
			const firstBoarding = records[0];
			if (!firstBoarding) continue;

			// Parse route start time (HH:MM:SS format)
			const [hours, minutes] = route.start_time.split(':').map(Number);
			const scheduledTime = new Date(firstBoarding.timestamp);
			scheduledTime.setHours(hours, minutes || 0, 0, 0);

			// Calculate delay in minutes
			const actualTime = new Date(firstBoarding.timestamp);
			const delayMinutes = Math.max(0, (actualTime.getTime() - scheduledTime.getTime()) / (1000 * 60));

			totalDelayMinutes += delayMinutes;
			assessedDays++;
		}

		if (assessedDays === 0) {
			return 100; // No days assessed, perfect score
		}

		// Calculate average delay
		const averageDelayMinutes = totalDelayMinutes / assessedDays;

		// Calculate penalty
		const punctualityPenalty = averageDelayMinutes * PENALTIES.PUNCTUALITY_DELAY_MINUTES;

		// Calculate score (max 100, deduct penalties, minimum 0)
		const score = Math.max(0, MAX_SCORE - punctualityPenalty);

		return score;
	}

	/**
	 * Recalculate ratings for ALL drivers for a specific period.
	 * This is intended to be called from a scheduler/cron job which
	 * decides the appropriate period (e.g. previous calendar month).
	 */
	static async recalculateAllDriverRatingsForPeriod(
		periodStart: Date,
		periodEnd: Date
	): Promise<void> {
		// Get all drivers
		const driverRole = await Role.findOne({ where: { name: 'driver' } });
		if (!driverRole) {
			console.warn('Driver role not found. Cannot recalculate ratings.');
			return;
		}

		const drivers = await User.findAll({
			where: {
				role_id: driverRole.id,
			},
		});

		// Recalculate rating for each driver
		for (const driver of drivers) {
			try {
				await this.calculateDriverRating(driver.id, periodStart, periodEnd);
				console.log(
					`Recalculated rating for driver ${driver.id} for period ${periodStart.toISOString()} - ${periodEnd.toISOString()}`
				);
			} catch (error) {
				console.error(
					`Error recalculating rating for driver ${driver.id} for period ${periodStart.toISOString()} - ${periodEnd.toISOString()}:`,
					error
				);
			}
		}
	}

	/**
	 * Recalculate rating for a driver for the current period (current month)
	 */
	static async recalculateCurrentPeriodRating(driverId: number): Promise<any> {
		const now = new Date();
		const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

		return await this.calculateDriverRating(driverId, periodStart, periodEnd);
	}

	/**
	 * Recalculate ratings for all drivers for the current period
	 */
	static async recalculateAllDriverRatings(): Promise<void> {
		const now = new Date();
		const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

		return await this.recalculateAllDriverRatingsForPeriod(periodStart, periodEnd);
	}

	/**
	 * Get driver rating for a specific period
	 */
	static async getDriverRating(
		driverId: number,
		periodStart: Date,
		periodEnd: Date
	): Promise<any | null> {
		return await DriverRating.findOne({
			where: {
				driver_id: driverId,
				period_start: periodStart,
				period_end: periodEnd,
			},
		});
	}

	/**
	 * Get current period rating for a driver
	 */
	static async getCurrentPeriodRating(driverId: number): Promise<any | null> {
		const now = new Date();
		const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

		return await this.getDriverRating(driverId, periodStart, periodEnd);
	}

	/**
	 * Get historical ratings for a driver (excluding current period)
	 */
	static async getDriverRatingHistory(driverId: number, limit?: number): Promise<any[]> {
		const now = new Date();
		const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);

		return await DriverRating.findAll({
			where: {
				driver_id: driverId,
				period_start: {
					[Op.lt]: currentPeriodStart,
				},
			},
			include: [
				{
					model: User,
					as: 'driver',
					attributes: ['id', 'name', 'email'],
				},
			],
			order: [['period_start', 'DESC']],
			limit: limit || 12,
		});
	}

	/**
	 * Get driver ratings by period with optional date range filtering
	 */
	static async getDriverRatingsByPeriod(
		driverId: number,
		periodStart?: Date,
		periodEnd?: Date,
		limit?: number
	): Promise<any[]> {
		const where: any = {
			driver_id: driverId,
		};

		// Add date range filtering if provided
		if (periodStart || periodEnd) {
			if (periodStart && periodEnd) {
				where[Op.and] = [
					{ period_start: { [Op.gte]: periodStart } },
					{ period_end: { [Op.lte]: periodEnd } },
				];
			} else if (periodStart) {
				where.period_start = { [Op.gte]: periodStart };
			} else if (periodEnd) {
				where.period_end = { [Op.lte]: periodEnd };
			}
		}

		return await DriverRating.findAll({
			where,
			include: [
				{
					model: User,
					as: 'driver',
					attributes: ['id', 'name', 'email'],
				},
			],
			order: [['period_start', 'DESC']],
			limit: limit || 50,
		});
	}

	/**
	 * Get all driver ratings with filtering and sorting (admin only)
	 */
	static async getAllDriverRatings(
		startDate?: Date,
		endDate?: Date,
		sortBy: string = 'overall_score',
		sortOrder: 'ASC' | 'DESC' = 'DESC',
		limit?: number
	): Promise<any[]> {
		const where: any = {};

		// Add date range filtering if provided
		if (startDate || endDate) {
			if (startDate && endDate) {
				where[Op.and] = [
					{ period_start: { [Op.gte]: startDate } },
					{ period_end: { [Op.lte]: endDate } },
				];
			} else if (startDate) {
				where.period_start = { [Op.gte]: startDate };
			} else if (endDate) {
				where.period_end = { [Op.lte]: endDate };
			}
		}

		// Validate sort field
		const validSortFields = [
			'overall_score',
			'safety_compliance_score',
			'parental_feedback_score',
			'operational_performance_score',
			'period_start',
		];
		const sortField = validSortFields.includes(sortBy) ? sortBy : 'overall_score';

		return await DriverRating.findAll({
			where,
			include: [
				{
					model: User,
					as: 'driver',
					attributes: ['id', 'name', 'email'],
				},
			],
			order: [[sortField, sortOrder]],
			limit: limit || 100,
		});
	}
}
