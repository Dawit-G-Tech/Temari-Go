import { Router } from 'express';
import {
	createBus,
	getAllBuses,
	getBusById,
	updateBus,
	deleteBus,
	assignDriver,
} from '../controllers/bus.controller';
import authMiddleware from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

// All bus routes require authentication and admin role
router.use(authMiddleware);
router.use(authorize('admin'));

// POST /api/buses - Create new bus
router.post('/', createBus);

// GET /api/buses - List all buses (driver info, routes)
router.get('/', getAllBuses);

// GET /api/buses/:id - Get bus details (driver, routes, current location, onboard students)
router.get('/:id', getBusById);

// PUT /api/buses/:id/assign-driver - Assign driver to bus (validate role, clear previous assignment)
router.put('/:id/assign-driver', assignDriver);

// PUT /api/buses/:id - Update bus (assign/reassign driver, capacity, bus number)
router.put('/:id', updateBus);

// DELETE /api/buses/:id - Delete bus (hard delete)
router.delete('/:id', deleteBus);

export default router;
