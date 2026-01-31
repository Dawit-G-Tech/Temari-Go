import { Router } from 'express';
import {
	submitAlcoholTest,
	getDriverAlcoholTests,
	getBusAlcoholTests,
} from '../controllers/alcoholTest.controller';
import authMiddleware from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/alcohol-tests - Submit alcohol test from microcontroller
router.post('/', submitAlcoholTest);

// GET /api/alcohol-tests/driver/:driverId - Get alcohol test history for a driver (Admin access only)
router.get('/driver/:driverId', authorize('admin'), getDriverAlcoholTests);

// GET /api/alcohol-tests/bus/:busId - Get alcohol test history for a bus (Admin/Driver access)
router.get('/bus/:busId', authorize('admin', 'driver'), getBusAlcoholTests);

export default router;
