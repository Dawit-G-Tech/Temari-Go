import { Router } from 'express';
import { getAllBuses } from '../controllers/bus.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getAllBuses);

export default router;

