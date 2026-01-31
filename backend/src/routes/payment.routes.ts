import { Router } from 'express';
import {
	initializePayment,
	verifyPayment,
	paymentSuccess,
	paymentWebhook,
} from '../controllers/payment.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

// Initialize payment (protected)
router.post('/pay', authMiddleware, initializePayment);

// Chapa webhook handler (public endpoint - configured in Chapa dashboard)
// Configure this URL in Chapa Dashboard: Settings > Webhooks > Add Webhook URL
router.post('/webhook', paymentWebhook);

// Manual payment verification (for testing/admin)
router.get('/verify/:id', authMiddleware, verifyPayment);

// Payment success page
router.get('/success', paymentSuccess);

export default router;
