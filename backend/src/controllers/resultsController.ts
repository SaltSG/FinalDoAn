import { RequestHandler } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { UserResults } from '../models/UserResults';
import { Curriculum } from '../models/Curriculum';

function getUserId(req: any): string | undefined {
  return (req.headers['x-user-id'] as string) || (req.query.userId as string) || (req.body && req.body.userId);
}

export const getResults: RequestHandler = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ message: 'userId required' });
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: 'invalid userId' });
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const doc = await UserResults.findOne({ user: user._id });
  return res.json({ data: (doc?.data || {}), stats: { semGpa4: doc?.semGpa4 || {}, cumGpa4: doc?.cumGpa4 || {} }, specialization: doc?.specialization });
};

export const updateResults: RequestHandler = async (req, res) => {
  const { data, specialization } = req.body ?? {};
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ message: 'userId required' });
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: 'invalid userId' });
  if (!data && specialization === undefined) return res.status(400).json({ message: 'data or specialization required' });
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  let semGpa4: Record<string, number> | undefined;
  let cumGpa4: Record<string, number> | undefined;
  const setPayload: any = {};

  if (data && typeof data === 'object') {
    const currDev = await Curriculum.findOne({ specialization: 'dev' });
    const currDesign = await Curriculum.findOne({ specialization: 'design' });
    const findCourseMeta = (semKey: string, code: string) => {
      const findIn = (cur: any | null) => {
        if (!cur) return undefined;
        const sem = (cur.semesters || []).find((s: any) => s.semester === semKey);
        if (!sem) return undefined;
        return (sem.courses || []).find((c: any) => c.code === code);
      };
      return findIn(currDev) || findIn(currDesign);
    };
    const fourFrom10 = (g: number | undefined | null): number | undefined => {
      if (g === undefined || g === null) return undefined;
      if (g >= 8.95) return 4.0;
      if (g >= 8.45) return 3.7;
      if (g >= 7.95) return 3.5;
      if (g >= 6.95) return 3.0;
      if (g >= 6.45) return 2.5;
      if (g >= 5.45) return 2.0;
      if (g >= 4.95) return 1.5;
      if (g >= 3.95) return 1.0;
      return 0.0;
    };
    semGpa4 = {};
    cumGpa4 = {};
    const sortedSemKeys = Object.keys(data).sort((a, b) => {
      const na = parseInt(String(a).replace(/\D+/g, ''), 10) || 0;
      const nb = parseInt(String(b).replace(/\D+/g, ''), 10) || 0;
      return na - nb;
    });
    let cumSumW = 0; let cumSumC = 0;
    for (const semKey of sortedSemKeys) {
      let sumW = 0; let sumC = 0;
      const courses = (data as any)[semKey] || {};
      for (const code of Object.keys(courses)) {
        const ov = courses[code];
        const meta = findCourseMeta(semKey, code);
        const countInGpa = meta?.countInGpa !== false;
        const credit = typeof meta?.credit === 'number' ? meta.credit : (ov.credit || 0);
        if (!countInGpa) continue;
        if (typeof ov.grade !== 'number') continue;
        const g4 = fourFrom10(ov.grade);
        if (g4 === undefined) continue;
        sumW += g4 * credit;
        sumC += credit;
        if (ov.grade >= 4.0) {
          cumSumW += g4 * credit;
          cumSumC += credit;
        }
      }
      (semGpa4 as any)[semKey] = sumC > 0 ? +(sumW / sumC).toFixed(2) : 0;
      (cumGpa4 as any)[semKey] = cumSumC > 0 ? +(cumSumW / cumSumC).toFixed(2) : 0;
    }
    setPayload.data = data;
    setPayload.semGpa4 = semGpa4;
    setPayload.cumGpa4 = cumGpa4;
  }

  if (specialization === 'dev' || specialization === 'design') {
    setPayload.specialization = specialization;
  }

  const doc = await UserResults.findOneAndUpdate(
    { user: user._id },
    { $set: setPayload },
    { new: true, upsert: true }
  );

  return res.json({ ok: true, data: doc.data, stats: { semGpa4: doc.semGpa4, cumGpa4: doc.cumGpa4 }, specialization: doc.specialization });
};

export const clearResults: RequestHandler = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ message: 'userId required' });
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: 'invalid userId' });
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  await UserResults.findOneAndUpdate({ user: user._id }, { $set: { data: {} } }, { upsert: true });
  return res.json({ ok: true });
};


