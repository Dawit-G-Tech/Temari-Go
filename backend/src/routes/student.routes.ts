import { Router } from 'express';
import { getAllStudents } from '../controllers/student.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getAllStudents);

export default router;

