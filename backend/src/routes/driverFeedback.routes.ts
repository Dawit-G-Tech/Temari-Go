import { Router } from 'express';
import { submitDriverFeedback } from '../controllers/driverFeedback.controller';
import authMiddleware from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/driver-feedback - Submit driver feedback (Parent access)
router.post('/', authorize('parent'), submitDriverFeedback);

export default router;
