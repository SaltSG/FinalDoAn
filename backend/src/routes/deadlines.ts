import { Router } from 'express';
import { listDeadlines, createDeadline, updateDeadline, deleteDeadline } from '../controllers/deadlineController';

export const deadlinesRouter = Router();

deadlinesRouter.get('/', listDeadlines);
deadlinesRouter.post('/', createDeadline);
deadlinesRouter.put('/:id', updateDeadline);
deadlinesRouter.delete('/:id', deleteDeadline);


