import { Router } from 'express';
import { listMessages, sendMessage, stream, getUnreadCount, markRead, uploadFile } from '../controllers/chatController';
import { requireAuth } from '../middleware/auth';
import { upload } from '../utils/upload';

export const chatRouter = Router();

chatRouter.get('/messages', listMessages);
chatRouter.post('/send', requireAuth, sendMessage);
chatRouter.get('/stream', stream);
chatRouter.get('/unread', requireAuth, getUnreadCount);
chatRouter.post('/read', requireAuth, markRead);
chatRouter.post('/upload', requireAuth, upload.single('file'), uploadFile);


