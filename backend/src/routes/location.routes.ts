import { Router } from 'express';
import {
	createLocation,
	getCurrentBusLocation,
	getBusLocationHistory,
} from '../controllers/location.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

// Public endpoint for microcontroller (can be secured with device authentication later)
router.post('/', createLocation);

// Protected endpoints for authenticated users (parents, admins, etc.)
router.get('/bus/:busId/current', authMiddleware, getCurrentBusLocation);
router.get('/bus/:busId/history', authMiddleware, getBusLocationHistory);

// Backwards-compatible endpoint (alias to history)
router.get('/bus/:busId', authMiddleware, getBusLocationHistory);

export default router;
