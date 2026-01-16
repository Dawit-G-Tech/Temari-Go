import cron from 'node-cron';
import { DriverRatingService } from '../services/driverRating.service';

/**
 * Schedule driver rating recalculation to run automatically once a month.
 *
 * Design:
 * - This scheduler only decides *when* to run and *which period* to use.
 * - The actual rating logic lives in `DriverRatingService.recalculateAllDriverRatingsForPeriod`.
 *
 * Strategy:
 * - Run at 00:05 on the 1st of each month (UTC).
 * - Recalculate ratings for the **previous calendar month**.
 */
export function startDriverRatingScheduler(): void {
	// Cron: minute hour day-of-month month day-of-week
	// '5 0 1 * *' => 00:05 on the 1st of every month (UTC)
	const cronExpression = '5 0 1 * *';

	cron.schedule(
		cronExpression,
		async () => {
			const now = new Date();

			// Previous calendar month period
			const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
			const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
			periodEnd.setHours(23, 59, 59, 999);

			console.log(
				`[Scheduler] Recalculating driver ratings for ${periodStart.toLocaleString('default', {
					month: 'long',
					year: 'numeric',
				})}...`
			);

			try {
				await DriverRatingService.recalculateAllDriverRatingsForPeriod(
					periodStart,
					periodEnd
				);
				console.log('[Scheduler] Driver ratings recalculation completed successfully.');
			} catch (error) {
				console.error('[Scheduler] Error recalculating driver ratings:', error);
			}
		},
		{
			scheduled: true,
			timezone: 'UTC', // Adjust timezone as needed
		}
	);

	console.log(
		'[Scheduler] Driver rating recalculation scheduler started. Will run monthly on the 1st at 00:05 (UTC).'
	);
}
