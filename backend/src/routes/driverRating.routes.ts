import { Router } from 'express';
import { getDriverRatings, getAllDriverRatings } from '../controllers/driverRating.controller';
import authMiddleware from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/driver-ratings/driver/:driverId - Get current and historical driver ratings (Admin/Driver access)
router.get('/driver/:driverId', authorize('admin', 'driver'), getDriverRatings);

// GET /api/driver-ratings - List all driver ratings (Admin access only)
router.get('/', authorize('admin'), getAllDriverRatings);

export default router;
