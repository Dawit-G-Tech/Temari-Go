import { Router } from 'express';
import {
	createGeofence,
	getAllGeofences,
	getGeofenceById,
	updateGeofence,
	deleteGeofence,
} from '../controllers/geofence.controller';
import authMiddleware from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/geofences - Create new geofence (Admin only)
router.post('/', authorize('admin'), createGeofence);

// GET /api/geofences - List all geofences (Admin/Driver access)
router.get('/', authorize('admin', 'driver'), getAllGeofences);

// GET /api/geofences/:id - Get specific geofence details
router.get('/:id', authorize('admin', 'driver'), getGeofenceById);

// PUT /api/geofences/:id - Update geofence (Admin only)
router.put('/:id', authorize('admin'), updateGeofence);

// DELETE /api/geofences/:id - Delete geofence (Admin only)
router.delete('/:id', authorize('admin'), deleteGeofence);

export default router;
