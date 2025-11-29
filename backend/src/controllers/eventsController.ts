import { RequestHandler } from 'express';
import { CalendarEvent } from '../models/CalendarEvent';

export const listEvents: RequestHandler = async (req, res) => {
  const userId = String((req as any).user?.id || '');
  if (!userId) return res.status(401).json({ message: 'unauthorized' });

  const { start, end } = req.query || {};
  const query: any = { userId };
  if (start && end) {
    const startDate = new Date(String(start));
    const endDate = new Date(String(end));
    // overlap: event.start < end && (event.end ?? event.start) > start
    query.$and = [
      { start: { $lt: endDate } },
      { $expr: { $gt: [{ $ifNull: ['$end', '$start'] }, startDate] } },
    ];
  }
  const docs = await CalendarEvent.find(query).sort({ start: 1 }).lean();
  res.json({ data: docs });
};

export const createEvent: RequestHandler = async (req, res) => {
  const userId = String((req as any).user?.id || '');
  if (!userId) return res.status(401).json({ message: 'unauthorized' });
  const { title, start, end, allDay = false, description, color, seriesId } = req.body || {};
  if (!title || !start) return res.status(400).json({ message: 'title and start required' });
  const doc = await CalendarEvent.create({
    userId,
    title: String(title),
    start: new Date(start),
    end: end ? new Date(end) : undefined,
    allDay: !!allDay,
    description: description ? String(description) : undefined,
    color: color ? String(color) : undefined,
    seriesId: seriesId ? String(seriesId) : undefined,
  });
  res.json({ ok: true, data: doc });
};

export const updateEvent: RequestHandler = async (req, res) => {
  const userId = String((req as any).user?.id || '');
  if (!userId) return res.status(401).json({ message: 'unauthorized' });
  const id = String(req.params.id || '');
  const { title, start, end, allDay, description, color, seriesId } = req.body || {};
  const doc = await CalendarEvent.findOneAndUpdate(
    { _id: id, userId },
    {
      $set: {
        ...(title !== undefined ? { title: String(title) } : {}),
        ...(start !== undefined ? { start: new Date(start) } : {}),
        ...(end !== undefined ? { end: end ? new Date(end) : undefined } : {}),
        ...(allDay !== undefined ? { allDay: !!allDay } : {}),
        ...(description !== undefined ? { description: description ? String(description) : undefined } : {}),
        ...(color !== undefined ? { color: color ? String(color) : undefined } : {}),
        ...(seriesId !== undefined ? { seriesId: seriesId ? String(seriesId) : undefined } : {}),
      },
    },
    { new: true }
  ).lean();
  if (!doc) return res.status(404).json({ message: 'not_found' });
  res.json({ ok: true, data: doc });
};

export const deleteEvent: RequestHandler = async (req, res) => {
  const userId = String((req as any).user?.id || '');
  if (!userId) return res.status(401).json({ message: 'unauthorized' });
  const id = String(req.params.id || '');
  const rs = await CalendarEvent.deleteOne({ _id: id, userId });
  if (!rs.deletedCount) return res.status(404).json({ message: 'not_found' });
  res.json({ ok: true });
};


