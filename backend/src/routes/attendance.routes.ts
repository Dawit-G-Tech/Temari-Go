import { Router } from 'express';
import { scanAttendance, syncAttendance, manualAttendance, getStudentAttendance, getBusAttendance, getAllAttendance } from '../controllers/attendance.controller';
import authMiddleware from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import deviceAuthMiddleware from '../middlewares/deviceAuth.middleware';

const router = Router();

// Microcontroller ingestion endpoints (secured via device auth)
router.post('/scan', deviceAuthMiddleware, scanAttendance);
router.post('/sync', deviceAuthMiddleware, syncAttendance);

// Protected endpoints for drivers and users
router.post('/manual', authMiddleware, manualAttendance);
router.get('/', authMiddleware, getAllAttendance);
router.get('/student/:studentId', authMiddleware, getStudentAttendance);
router.get('/bus/:busId', authMiddleware, authorize('driver', 'admin'), getBusAttendance);

export default router;

