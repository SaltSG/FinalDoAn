import express from 'express';
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth';
import { User } from '../models/User';
import { UserResults } from '../models/UserResults';
import { Curriculum } from '../models/Curriculum';
import { Deadline } from '../models/Deadline';

const router = express.Router();

const DEFAULT_ML_CHAT_URL = 'http://127.0.0.1:8000/chat';

async function callMlChatService(message: string, userId?: string) {
  const url = process.env.ML_CHAT_URL || DEFAULT_ML_CHAT_URL;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId, message }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ml_chat_error:${res.status}:${text}`);
  }

  return res.json() as Promise<{ reply: string }>;
}

// Chat message -> forward to Python service
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user as { id: string } | undefined;
  const { message } = req.body as { message?: string };

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ message: 'message_required' });
  }

  try {
    const data = await callMlChatService(message.trim(), user?.id);
    return res.json({ reply: data.reply ?? '' });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[chatbot] error', err?.message ?? err);
    return res.status(502).json({ reply: 'Chatbot đang gặp lỗi, bạn thử lại sau nhé.' });
  }
});

// Aggregated context for ML/chatbot (used by Python service)
router.get('/context', async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);
  if (!userId) return res.status(400).json({ message: 'userId required' });
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: 'invalid userId' });

  const user = await User.findById(userId).lean();
  if (!user) return res.status(404).json({ message: 'User not found' });

  const resultsDoc = await UserResults.findOne({ user: user._id }).lean();
  const specialization = resultsDoc?.specialization;

  let curriculum: any = null;
  if (specialization) {
    curriculum = await Curriculum.findOne({ specialization }).lean();
  } else {
    curriculum = await Curriculum.findOne().lean();
  }

  const deadlines = await Deadline.find({ user: user._id }).sort({ createdAt: -1 }).lean();

  return res.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      provider: user.provider,
    },
    results: resultsDoc?.data || {},
    stats: {
      semGpa4: resultsDoc?.semGpa4 || {},
      cumGpa4: resultsDoc?.cumGpa4 || {},
    },
    specialization: resultsDoc?.specialization || null,
    curriculum,
    deadlines,
  });
});

export const chatbotRouter = router;


