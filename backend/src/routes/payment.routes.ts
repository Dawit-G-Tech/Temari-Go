import { Router } from 'express';
import {
	initializePayment,
	verifyPayment,
	paymentSuccess,
	paymentWebhook,
} from '../controllers/payment.controller';
import authMiddleware from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

// Initialize payment (admin only — web dashboard; parents use mobile app)
router.post('/pay', authMiddleware, authorize('admin'), initializePayment);

// Chapa webhook handler (public endpoint - configured in Chapa dashboard)
// Configure this URL in Chapa Dashboard: Settings > Webhooks > Add Webhook URL
router.post('/webhook', paymentWebhook);

// Manual payment verification (admin only)
router.get('/verify/:id', authMiddleware, authorize('admin'), verifyPayment);

// Payment success page
router.get('/success', paymentSuccess);

export default router;
