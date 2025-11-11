import { RequestHandler } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Deadline, DeadlineStatus } from '../models/Deadline';

function getUserId(req: any): string | undefined {
  return (req.headers['x-user-id'] as string) || (req.query.userId as string) || (req.body && req.body.userId);
}

function computeStatus(startAt?: Date | null, endAt?: Date | null, current?: DeadlineStatus): DeadlineStatus {
  if (current === 'completed') return 'completed';
  const now = new Date();
  if (endAt && now > endAt) return 'overdue';
  if (startAt && endAt && now >= startAt && now <= endAt) return 'ongoing';
  return 'upcoming';
}

export const listDeadlines: RequestHandler = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ message: 'userId required' });
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: 'invalid userId' });
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Auto-refresh status on fetch for non-completed items
  const items = await Deadline.find({ user: user._id }).sort({ createdAt: -1 }).lean();
  const updates: any[] = [];
  for (const it of items) {
    const next = computeStatus(it.startAt as any, it.endAt as any, it.status as any);
    if (next !== it.status) updates.push({ _id: it._id, status: next });
  }
  if (updates.length) {
    const bulk = updates.map((u) => ({ updateOne: { filter: { _id: u._id }, update: { $set: { status: u.status } } } }));
    await Deadline.bulkWrite(bulk);
  }

  const status = String(req.query.status || '').toLowerCase();
  const refreshed = await Deadline.find({ user: user._id }).sort({ createdAt: -1 }).lean();
  const filtered = !status
    ? refreshed
    : refreshed.filter((d: any) => {
        const effective = computeStatus(d.startAt as any, d.endAt as any, d.status as any);
        if (status === 'completed') return effective === 'completed';
        if (status === 'incomplete') return effective !== 'completed';
        if (status === 'ongoing' || status === 'upcoming' || status === 'overdue') return effective === status;
        return true;
      });
  return res.json({ data: filtered });
};

export const createDeadline: RequestHandler = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ message: 'userId required' });
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: 'invalid userId' });
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const { title, startAt, endAt, note, status } = req.body || {};
  if (!title || typeof title !== 'string') return res.status(400).json({ message: 'title required' });
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  const computed = computeStatus(start, end, status as DeadlineStatus);
  const doc = await Deadline.create({ user: user._id, title, startAt: start, endAt: end, note: note || '', status: computed });
  return res.json({ ok: true, data: doc });
};

export const updateDeadline: RequestHandler = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ message: 'userId required' });
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: 'invalid userId' });
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const id = String(req.params.id || '');
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'invalid id' });
  const { title, startAt, endAt, note, status } = req.body || {};
  const start = startAt !== undefined ? (startAt ? new Date(startAt) : null) : undefined;
  const end = endAt !== undefined ? (endAt ? new Date(endAt) : null) : undefined;

  const existing = await Deadline.findOne({ _id: id, user: user._id });
  if (!existing) return res.status(404).json({ message: 'Deadline not found' });

  const nextStatus = computeStatus(start !== undefined ? (start as any) : (existing.startAt as any), end !== undefined ? (end as any) : (existing.endAt as any), status ?? existing.status);

  existing.title = title ?? existing.title;
  if (start !== undefined) existing.startAt = start as any;
  if (end !== undefined) existing.endAt = end as any;
  existing.note = note ?? existing.note;
  existing.status = nextStatus;
  await existing.save();
  return res.json({ ok: true, data: existing });
};

export const deleteDeadline: RequestHandler = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ message: 'userId required' });
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: 'invalid userId' });
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const id = String(req.params.id || '');
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'invalid id' });
  await Deadline.deleteOne({ _id: id, user: user._id });
  return res.json({ ok: true });
};


