import { Router } from 'express';
import {
	createRouteAssignment,
	getAssignmentsByRouteId,
	deleteRouteAssignment,
} from '../controllers/routeAssignment.controller';
import authMiddleware from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

router.use(authMiddleware);
router.use(authorize('admin'));

// POST /api/route-assignments - Assign student to route (pickup coords, validate not already assigned)
router.post('/', createRouteAssignment);

// GET /api/route-assignments/route/:routeId - Get all students assigned to a route (include pickup locations)
router.get('/route/:routeId', getAssignmentsByRouteId);

// DELETE /api/route-assignments/:id - Remove student from route
router.delete('/:id', deleteRouteAssignment);

export default router;
