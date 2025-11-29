import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { listUsers, updateUser, getUserStats } from '../controllers/adminController';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/users', listUsers);
adminRouter.patch('/users/:id', updateUser);
adminRouter.get('/stats/users', getUserStats);

