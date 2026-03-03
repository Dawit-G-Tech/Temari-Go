import { Router } from 'express';
import { createBulk, listInvoices } from '../controllers/invoice.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', listInvoices);
router.post('/bulk', createBulk);

export default router;
