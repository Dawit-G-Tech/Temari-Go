import { Router } from 'express';
import { getParentPayments, getStudentPayments, updatePaymentStatus } from '../controllers/payment.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

// Payment history endpoints (protected)
router.get('/parent/:parentId', authMiddleware, getParentPayments);
router.get('/student/:studentId', authMiddleware, getStudentPayments);

// Admin-only: Manual payment status update
router.put('/:id/status', authMiddleware, updatePaymentStatus);

export default router;
