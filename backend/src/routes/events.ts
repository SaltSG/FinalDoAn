import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { listEvents, createEvent, updateEvent, deleteEvent } from '../controllers/eventsController';

export const eventsRouter = Router();

eventsRouter.get('/', requireAuth, listEvents);
eventsRouter.post('/', requireAuth, createEvent);
eventsRouter.put('/:id', requireAuth, updateEvent);
eventsRouter.delete('/:id', requireAuth, deleteEvent);


