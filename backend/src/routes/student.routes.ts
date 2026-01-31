import { Router } from 'express';
import {
	createStudent,
	getAllStudents,
	getStudentById,
	updateStudent,
	deleteStudent,
} from '../controllers/student.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

// All student routes require authentication
router.use(authMiddleware);

// Create new student
router.post('/', createStudent);

// List students (with filters)
router.get('/', getAllStudents);

// Get student details
router.get('/:id', getStudentById);

// Update student
router.put('/:id', updateStudent);

// Delete student
router.delete('/:id', deleteStudent);

export default router;

