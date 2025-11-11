import { RequestHandler } from 'express';
import { ChatMessage } from '../models/ChatMessage';
import { ChatRead } from '../models/ChatRead';
import path from 'path';
import { buildPublicUrl } from '../utils/upload';

// In-memory SSE clients per room
type Client = { id: string; res: any };
const roomClients = new Map<string, Set<Client>>();

function broadcast(room: string, data: any) {
  const set = roomClients.get(room);
  if (!set) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const c of set) {
    try { c.res.write(payload); } catch { /* ignore */ }
  }
}

export const stream: RequestHandler = async (req, res) => {
  const room = String(req.query.room || 'global');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write('retry: 5000\n\n');
  const id = Math.random().toString(36).slice(2);
  const client: Client = { id, res };
  if (!roomClients.has(room)) roomClients.set(room, new Set());
  roomClients.get(room)!.add(client);
  req.on('close', () => {
    roomClients.get(room)?.delete(client);
  });
};

export const listMessages: RequestHandler = async (req, res) => {
  const room = String(req.query.room || 'global');
  const limit = Math.min(200, Math.max(1, Number(req.query.limit || 100)));
  const docs = await ChatMessage.find({ room }).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ data: docs.reverse() });
};

export const sendMessage: RequestHandler = async (req, res) => {
  const { room = 'global', content } = req.body || {};
  const user = (req as any).user as { id: string; name?: string; email?: string } | undefined;
  const userId = user?.id;
  const userName = user?.name || user?.email;
  if (!userId || !content) return res.status(400).json({ message: 'userId and content required' });
  const doc = await ChatMessage.create({ room, userId, userName, content });
  const payload = { _id: doc._id, room, userId, userName, content, createdAt: doc.createdAt };
  broadcast(room, { type: 'message', data: payload });
  res.json({ ok: true, data: payload });
};

// Server-side unread tracking
export const getUnreadCount: RequestHandler = async (req, res) => {
  const room = String(req.query.room || 'global');
  const userId = String((req as any).user?.id || '');
  if (!userId) return res.status(401).json({ message: 'unauthorized' });
  const read = await ChatRead.findOne({ room, userId }).lean();
  const last = read?.lastReadAt ? new Date(read.lastReadAt) : new Date(0);
  const cnt = await ChatMessage.countDocuments({ room, createdAt: { $gt: last }, userId: { $ne: userId } });
  res.json({ data: { room, userId, unread: cnt, lastReadAt: last } });
};

export const markRead: RequestHandler = async (req, res) => {
  const { room = 'global' } = req.body || {};
  const userId = String((req as any).user?.id || '');
  if (!userId) return res.status(401).json({ message: 'unauthorized' });
  const now = new Date();
  const doc = await ChatRead.findOneAndUpdate(
    { room, userId },
    { $set: { lastReadAt: now } },
    { upsert: true, new: true }
  ).lean();
  res.json({ ok: true, data: { room, userId, lastReadAt: doc?.lastReadAt || now } });
};

export const uploadFile: RequestHandler = async (req, res) => {
  const userId = String((req as any).user?.id || '');
  if (!userId) return res.status(401).json({ message: 'unauthorized' });
  const f = (req as any).file as {
    filename?: string;
    originalname: string;
    size: number;
    mimetype: string;
  } | undefined;
  if (!f) return res.status(400).json({ message: 'file_required' });
  const url = buildPublicUrl(path.basename(f.filename || f.originalname));
  return res.json({
    ok: true,
    file: {
      url,
      name: f.originalname,
      size: f.size,
      mimeType: f.mimetype,
    },
  });
};


