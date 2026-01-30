import { Router } from 'express';
import {
	initializePayment,
	verifyPayment,
	paymentSuccess,
	paymentCallback,
} from '../controllers/payment.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

// Initialize payment (protected)
router.post('/pay', authMiddleware, initializePayment);

// Chapa webhook callback (public endpoint - called by Chapa)
router.post('/callback/:txRef', paymentCallback);

// Manual payment verification (for testing/admin)
router.get('/verify/:id', authMiddleware, verifyPayment);

// Payment success page
router.get('/success', paymentSuccess);

export default router;
