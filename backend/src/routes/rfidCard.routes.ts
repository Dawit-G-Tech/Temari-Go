import { Router } from 'express';
import {
	assignRfidCard,
	getActiveRfidCardByStudent,
	deactivateRfidCard,
} from '../controllers/rfidCard.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Assign RFID card to student (admin only enforced in controller)
router.post('/assign', assignRfidCard);

// Get active RFID card for student (must be before /:id)
router.get('/student/:studentId', getActiveRfidCardByStudent);

// Deactivate RFID card
router.put('/:id/deactivate', deactivateRfidCard);

export default router;
