import { Router } from 'express';
import { scanAttendance, syncAttendance, manualAttendance, getStudentAttendance, getBusAttendance, getAllAttendance } from '../controllers/attendance.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

// Public endpoints for microcontroller (can be secured with device authentication later)
router.post('/scan', scanAttendance);
router.post('/sync', syncAttendance);

// Protected endpoints for drivers and users
router.post('/manual', authMiddleware, manualAttendance);
router.get('/', authMiddleware, getAllAttendance);
router.get('/student/:studentId', authMiddleware, getStudentAttendance);
router.get('/bus/:busId', authMiddleware, getBusAttendance);

export default router;

