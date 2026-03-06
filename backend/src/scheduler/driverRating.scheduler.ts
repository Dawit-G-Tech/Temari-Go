import cron from 'node-cron';
import { DriverRatingService } from '../services/driverRating.service';
import { db } from '../../models';
import { QueryTypes } from 'sequelize';

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
			// Prevent duplicate work when running multiple backend instances.
			// Use a stable advisory lock key for this job.
			const LOCK_KEY = 910_000_001; // arbitrary, stable bigint-ish key
			const [{ acquired }] = (await (db as any).sequelize.query(
				'SELECT pg_try_advisory_lock(:key) AS acquired',
				{
					replacements: { key: LOCK_KEY },
					type: QueryTypes.SELECT,
				}
			)) as Array<{ acquired: boolean }>;

			if (!acquired) {
				console.log('[Scheduler] Driver ratings job already running on another instance. Skipping.');
				return;
			}

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
			} finally {
				try {
					await (db as any).sequelize.query('SELECT pg_advisory_unlock(:key)', {
						replacements: { key: LOCK_KEY },
						type: QueryTypes.SELECT,
					});
				} catch (e) {
					console.warn('[Scheduler] Failed to release advisory lock:', e);
				}
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
