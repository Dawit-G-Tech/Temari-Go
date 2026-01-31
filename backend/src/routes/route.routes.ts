import { Router } from 'express';
import {
	createRoute,
	getAllRoutes,
	getRouteById,
	updateRoute,
	deleteRoute,
	optimizeRoute,
	getRouteDirections,
} from '../controllers/route.controller';
import authMiddleware from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

// All route CRUD operations require authentication and admin role
router.use(authMiddleware);
router.use(authorize('admin'));

// POST /api/routes - Create new route (link to bus, set start/end times)
router.post('/', createRoute);

// GET /api/routes - List all routes (optional filter by bus_id)
router.get('/', getAllRoutes);

// GET /api/routes/:id - Get route details (assigned students, pickup points)
router.get('/:id', getRouteById);

// POST /api/routes/:id/optimize - Optimize route (zones, order, waypoints)
router.post('/:id/optimize', optimizeRoute);

// GET /api/routes/:id/directions - Google Directions (polyline, duration, ETAs)
router.get('/:id/directions', getRouteDirections);

// PUT /api/routes/:id - Update route information
router.put('/:id', updateRoute);

// DELETE /api/routes/:id - Delete route
router.delete('/:id', deleteRoute);

export default router;
