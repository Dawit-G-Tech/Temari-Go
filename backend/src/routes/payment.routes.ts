import { Router } from 'express';
import { initializePayment, verifyPayment, paymentSuccess } from '../controllers/payment.controller';

const router = Router();

router.post('/pay', initializePayment);
router.get('/verify/:id', verifyPayment);
router.get('/success', paymentSuccess);

export default router;
