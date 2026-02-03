import { Router } from 'express';
import {
	createSchool,
	getAllSchools,
	getSchoolById,
	updateSchool,
	deleteSchool,
} from '../controllers/school.controller';
import authMiddleware from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

router.use(authMiddleware);
router.use(authorize('admin'));

router.post('/', createSchool);
router.get('/', getAllSchools);
router.get('/:id', getSchoolById);
router.put('/:id', updateSchool);
router.delete('/:id', deleteSchool);

export default router;
