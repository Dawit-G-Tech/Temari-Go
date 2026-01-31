import { Request, Response } from 'express';
import { DriverFeedbackService, DriverFeedbackInput } from '../services/driverFeedback.service';

/**
 * Submit driver feedback from parent
 * POST /api/driver-feedback
 */
export const submitDriverFeedback = async (req: Request, res: Response) => {
	try {
		const { driver_id, parent_id, rating, comment } = req.body;

		// Validate required fields
		if (!driver_id) {
			return res.status(400).json({
				success: false,
				code: 'MISSING_DRIVER_ID',
				message: 'driver_id is required.',
			});
		}

		if (!parent_id) {
			return res.status(400).json({
				success: false,
				code: 'MISSING_PARENT_ID',
				message: 'parent_id is required.',
			});
		}

		if (rating === undefined || rating === null) {
			return res.status(400).json({
				success: false,
				code: 'MISSING_RATING',
				message: 'rating is required.',
			});
		}

		// Validate rating range
		if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
			return res.status(400).json({
				success: false,
				code: 'INVALID_RATING',
				message: 'rating must be an integer between 1 and 5.',
			});
		}

		// Prepare input
		const input: DriverFeedbackInput = {
			driver_id: Number(driver_id),
			parent_id: Number(parent_id),
			rating: Number(rating),
			comment: comment || undefined,
		};

		// Submit feedback
		const result = await DriverFeedbackService.submitFeedback(input);

		return res.status(201).json({
			success: true,
			data: result,
			message: result.message,
		});
	} catch (error: any) {
		console.error('Driver feedback submission error:', error);

		if (error.status && error.code) {
			return res.status(error.status).json({
				success: false,
				code: error.code,
				message: error.message,
			});
		}

		return res.status(500).json({
			success: false,
			code: 'INTERNAL_ERROR',
			message: 'An error occurred while submitting driver feedback.',
		});
	}
};
