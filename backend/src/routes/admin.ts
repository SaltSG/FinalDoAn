import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import {
  getStats,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  getAllDeadlines,
  getChatStats,
} from '../controllers/adminController';
import {
  getBySpec,
  addCourse,
  updateCourse,
  deleteCourse,
  seed,
} from '../controllers/curriculumController';

export const adminRouter = Router();

// All admin routes require admin authentication
adminRouter.use(requireAdmin);

// Stats
adminRouter.get('/stats', getStats);

// Users management
adminRouter.get('/users', listUsers);
adminRouter.get('/users/:id', getUser);
adminRouter.put('/users/:id', updateUser);
adminRouter.delete('/users/:id', deleteUser);

// Deadlines management
adminRouter.get('/deadlines', getAllDeadlines);

// Chat stats
adminRouter.get('/chat/stats', getChatStats);

// Curriculum management (admin can manage curriculum)
adminRouter.get('/curriculum/:spec', getBySpec);
adminRouter.post('/curriculum/:spec/course', addCourse);
adminRouter.put('/curriculum/:spec/course', updateCourse);
adminRouter.delete('/curriculum/:spec/course', deleteCourse);
adminRouter.post('/curriculum/seed', seed);

