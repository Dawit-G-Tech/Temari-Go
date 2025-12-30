import { Router } from 'express';
import { scanAttendance, getStudentAttendance, getBusAttendance, getAllAttendance } from '../controllers/attendance.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

// Public endpoint for microcontroller (can be secured with device authentication later)
router.post('/scan', scanAttendance);

// Protected endpoints for users
router.get('/', authMiddleware, getAllAttendance);
router.get('/student/:studentId', authMiddleware, getStudentAttendance);
router.get('/bus/:busId', authMiddleware, getBusAttendance);

export default router;

