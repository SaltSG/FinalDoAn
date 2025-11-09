import { Router } from 'express';
import { listMessages, sendMessage, stream, getUnreadCount, markRead } from '../controllers/chatController';
import { requireAuth } from '../middleware/auth';

export const chatRouter = Router();

chatRouter.get('/messages', listMessages);
chatRouter.post('/send', sendMessage);
chatRouter.get('/stream', stream);
chatRouter.get('/unread', requireAuth, getUnreadCount);
chatRouter.post('/read', requireAuth, markRead);


