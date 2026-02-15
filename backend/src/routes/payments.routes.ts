import { Router } from 'express';
import {
  getAdminPayments,
  getParentPayments,
  getStudentPayments,
  updatePaymentStatus,
} from '../controllers/payment.controller';
import authMiddleware from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

// Admin-only: List all payments (must be before /parent/:parentId so GET / is matched)
router.get('/', authMiddleware, authorize('admin'), getAdminPayments);

// Payment history endpoints (protected)
router.get('/parent/:parentId', authMiddleware, getParentPayments);
router.get('/student/:studentId', authMiddleware, getStudentPayments);

// Admin-only: Manual payment status update
router.put('/:id/status', authMiddleware, updatePaymentStatus);

export default router;
