import { Request, Response } from 'express';
import { DriverRatingService } from '../services/driverRating.service';

/**
 * Get current and historical driver ratings for a specific driver
 * GET /api/driver-ratings/driver/:driverId
 * Query params: periodStart, periodEnd, limit
 */
export const getDriverRatings = async (req: Request, res: Response) => {
	try {
		const { driverId } = req.params;
		const { periodStart, periodEnd, limit } = req.query;

		// If user is a driver, they can only access their own ratings
		if (req.user && req.user.role === 'driver' && Number(req.user.id) !== Number(driverId)) {
			return res.status(403).json({
				success: false,
				code: 'FORBIDDEN',
				message: 'You can only access your own ratings.',
			});
		}

		// If no period specified, get current period rating
		if (!periodStart && !periodEnd) {
			const currentRating = await DriverRatingService.getCurrentPeriodRating(Number(driverId));

			if (!currentRating) {
				return res.status(200).json({
					success: true,
					data: {
						current: null,
						historical: [],
					},
					message: 'No rating found for current period.',
				});
			}

			// Get historical ratings (all except current)
			const historicalRatings = await DriverRatingService.getDriverRatingHistory(
				Number(driverId),
				Number(limit) || 12
			);

			return res.status(200).json({
				success: true,
				data: {
					current: {
						...currentRating.toJSON(),
						breakdown: {
							safety_compliance: {
								score: Number(currentRating.safety_compliance_score || 0),
								weight: '40%',
							},
							parental_feedback: {
								score: Number(currentRating.parental_feedback_score || 0),
								weight: '35%',
							},
							operational_performance: {
								score: Number(currentRating.operational_performance_score || 0),
								weight: '25%',
							},
						},
					},
					historical: historicalRatings.map((rating) => ({
						...rating.toJSON(),
						breakdown: {
							safety_compliance: {
								score: Number(rating.safety_compliance_score || 0),
								weight: '40%',
							},
							parental_feedback: {
								score: Number(rating.parental_feedback_score || 0),
								weight: '35%',
							},
							operational_performance: {
								score: Number(rating.operational_performance_score || 0),
								weight: '25%',
							},
						},
					})),
				},
			});
		}

		// Validate date parameters if provided
		let startDateObj: Date | undefined;
		let endDateObj: Date | undefined;

		if (periodStart) {
			startDateObj = new Date(periodStart as string);
			if (isNaN(startDateObj.getTime())) {
				return res.status(400).json({
					success: false,
					code: 'INVALID_START_DATE',
					message: 'Invalid periodStart format. Use ISO 8601 format (e.g., 2024-01-01).',
				});
			}
		}

		if (periodEnd) {
			endDateObj = new Date(periodEnd as string);
			if (isNaN(endDateObj.getTime())) {
				return res.status(400).json({
					success: false,
					code: 'INVALID_END_DATE',
					message: 'Invalid periodEnd format. Use ISO 8601 format (e.g., 2024-01-31).',
				});
			}
		}

		// Validate date range
		if (startDateObj && endDateObj && startDateObj > endDateObj) {
			return res.status(400).json({
				success: false,
				code: 'INVALID_DATE_RANGE',
				message: 'periodStart must be before or equal to periodEnd.',
			});
		}

		// Get ratings for the specified period
		const ratings = await DriverRatingService.getDriverRatingsByPeriod(
			Number(driverId),
			startDateObj,
			endDateObj,
			limit ? Number(limit) : undefined
		);

		return res.status(200).json({
			success: true,
			data: ratings.map((rating) => ({
				...rating.toJSON(),
				breakdown: {
					safety_compliance: {
						score: Number(rating.safety_compliance_score || 0),
						weight: '40%',
					},
					parental_feedback: {
						score: Number(rating.parental_feedback_score || 0),
						weight: '35%',
					},
					operational_performance: {
						score: Number(rating.operational_performance_score || 0),
						weight: '25%',
					},
				},
			})),
			count: ratings.length,
		});
	} catch (error: any) {
		console.error('Get driver ratings error:', error);

		return res.status(500).json({
			success: false,
			code: 'INTERNAL_ERROR',
			message: 'An error occurred while fetching driver ratings.',
		});
	}
};

/**
 * List all driver ratings (admin only)
 * GET /api/driver-ratings
 * Query params: startDate, endDate, sortBy, limit
 */
export const getAllDriverRatings = async (req: Request, res: Response) => {
	try {
		const { startDate, endDate, sortBy, limit } = req.query;

		// Validate date parameters if provided
		let startDateObj: Date | undefined;
		let endDateObj: Date | undefined;

		if (startDate) {
			startDateObj = new Date(startDate as string);
			if (isNaN(startDateObj.getTime())) {
				return res.status(400).json({
					success: false,
					code: 'INVALID_START_DATE',
					message: 'Invalid startDate format. Use ISO 8601 format (e.g., 2024-01-01).',
				});
			}
		}

		if (endDate) {
			endDateObj = new Date(endDate as string);
			if (isNaN(endDateObj.getTime())) {
				return res.status(400).json({
					success: false,
					code: 'INVALID_END_DATE',
					message: 'Invalid endDate format. Use ISO 8601 format (e.g., 2024-01-31).',
				});
			}
		}

		// Validate date range
		if (startDateObj && endDateObj && startDateObj > endDateObj) {
			return res.status(400).json({
				success: false,
				code: 'INVALID_DATE_RANGE',
				message: 'startDate must be before or equal to endDate.',
			});
		}

		// Validate sortBy
		const validSortFields = ['overall_score', 'safety_compliance_score', 'parental_feedback_score', 'operational_performance_score', 'period_start'];
		const sortField = sortBy && validSortFields.includes(sortBy as string) ? (sortBy as string) : 'overall_score';
		const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

		// Get all driver ratings
		const ratings = await DriverRatingService.getAllDriverRatings(
			startDateObj,
			endDateObj,
			sortField,
			sortOrder,
			limit ? Number(limit) : undefined
		);

		return res.status(200).json({
			success: true,
			data: ratings.map((rating) => ({
				...rating.toJSON(),
				breakdown: {
					safety_compliance: {
						score: Number(rating.safety_compliance_score || 0),
						weight: '40%',
					},
					parental_feedback: {
						score: Number(rating.parental_feedback_score || 0),
						weight: '35%',
					},
					operational_performance: {
						score: Number(rating.operational_performance_score || 0),
						weight: '25%',
					},
				},
			})),
			count: ratings.length,
		});
	} catch (error: any) {
		console.error('Get all driver ratings error:', error);

		return res.status(500).json({
			success: false,
			code: 'INTERNAL_ERROR',
			message: 'An error occurred while fetching driver ratings.',
		});
	}
};
