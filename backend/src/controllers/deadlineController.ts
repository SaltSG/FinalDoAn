import { RequestHandler } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Deadline, DeadlineStatus } from '../models/Deadline';

function getUserId(req: any): string | undefined {
  return (req.headers['x-user-id'] as string) || (req.query.userId as string) || (req.body && req.body.userId);
}

function computeStatus(startAt?: Date | null, endAt?: Date | null, current?: DeadlineStatus | null): DeadlineStatus {
  // If current is explicitly null, unmark completed and recalculate from dates
  if (current === null) {
    const now = new Date();
    if (endAt && now > endAt) return 'overdue';
    if (startAt && endAt && now >= startAt && now <= endAt) return 'ongoing';
    return 'upcoming';
  }
  // If explicitly completed, keep it completed
  if (current === 'completed') return 'completed';
  // Otherwise calculate from dates
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

  const { title, startAt, endAt, note, status, isExam, courseCode } = req.body || {};
  if (!title || typeof title !== 'string') return res.status(400).json({ message: 'title required' });
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  const computed = computeStatus(start, end, status as DeadlineStatus);
  const doc = await Deadline.create({
    user: user._id,
    title,
    courseCode: courseCode || undefined,
    startAt: start,
    endAt: end,
    note: note || '',
    isExam: !!isExam,
    status: computed,
  });
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
  const { title, startAt, endAt, note, status, isExam, courseCode } = req.body || {};
  const start = startAt !== undefined ? (startAt ? new Date(startAt) : null) : undefined;
  const end = endAt !== undefined ? (endAt ? new Date(endAt) : null) : undefined;

  const existing = await Deadline.findOne({ _id: id, user: user._id });
  if (!existing) return res.status(404).json({ message: 'Deadline not found' });

  // Determine final dates to use for status calculation
  const finalStart = start !== undefined ? (start as any) : (existing.startAt as any);
  const finalEnd = end !== undefined ? (end as any) : (existing.endAt as any);
  
  // Check if dates are being updated (we don't need to know *how* they changed,
  // just that at least one of start/end was provided in the request)
  const datesChanged = start !== undefined || end !== undefined;
  
  let statusToUse: DeadlineStatus | null | undefined;
  if (status === null || status === '') {
    statusToUse = null; // Explicitly unmark completed
  } else if (status !== undefined) {
    statusToUse = status as DeadlineStatus;
  } else if (datesChanged && existing.status !== 'completed') {
    // Dates changed and not completed -> recalculate from dates
    statusToUse = null; // Force recalculation
  } else {
    statusToUse = existing.status; // Keep existing status
  }
  
  const nextStatus = computeStatus(finalStart, finalEnd, statusToUse);

  existing.title = title ?? existing.title;
  if (courseCode !== undefined) existing.courseCode = courseCode || undefined;
  if (start !== undefined) existing.startAt = start as any;
  if (end !== undefined) existing.endAt = end as any;
  existing.note = note ?? existing.note;
  if (isExam !== undefined) existing.isExam = !!isExam;
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


