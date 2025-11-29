import { RequestHandler } from 'express';
import { User } from '../models/User';

export const listUsers: RequestHandler = async (_req, res) => {
  const users = await User.find({}, 'email name provider picture role status createdAt updatedAt')
    .sort({ createdAt: -1 })
    .lean();
  const data = users.map((u) => ({
    id: String(u._id),
    email: u.email,
    name: u.name,
    provider: u.provider,
    picture: (u as any).picture,
    role: (u as any).role ?? 'user',
    status: (u as any).status ?? 'active',
    createdAt: (u as any).createdAt,
    updatedAt: (u as any).updatedAt,
  }));
  res.json({ users: data });
};

export const updateUser: RequestHandler = async (req, res) => {
  const { id } = req.params ?? {};
  const { role, status } = req.body ?? {};

  if (!id) return res.status(400).json({ message: 'id_required' });

  const current = (req as any).user as { id: string } | undefined;
  if (current && current.id === id && status === 'locked') {
    return res.status(400).json({ message: 'cannot_lock_self' });
  }

  const update: Record<string, any> = {};
  if (role === 'user' || role === 'admin') update.role = role;
  if (status === 'active' || status === 'locked') update.status = status;

  const user = await User.findByIdAndUpdate(id, update, { new: true, projection: 'email name provider picture role status createdAt updatedAt' });
  if (!user) return res.status(404).json({ message: 'user_not_found' });

  res.json({
    user: {
      id: String(user._id),
      email: user.email,
      name: user.name,
      provider: user.provider,
      picture: (user as any).picture,
      role: user.role ?? 'user',
      status: user.status ?? 'active',
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    },
  });
};

export const getUserStats: RequestHandler = async (_req, res) => {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const sevenDaysAgo = new Date(now.getTime() - 7 * dayMs);

  // Bắt đầu từ 30 ngày trước (bao gồm hôm nay) tại mốc 00:00
  const start = new Date(now.getTime() - 29 * dayMs);
  start.setHours(0, 0, 0, 0);

  const [totalUsers, activeLast7Days, totalBeforeWindow, dailyAgg] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ lastLoginAt: { $gte: sevenDaysAgo } }),
    User.countDocuments({ createdAt: { $lt: start } }),
    User.aggregate([
      { $match: { createdAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const byDate = new Map<string, number>();
  for (const row of dailyAgg as Array<{ _id: string; count: number }>) {
    byDate.set(row._id, row.count);
  }

  const daily: { date: string; newUsers: number; totalUsers: number }[] = [];
  let runningTotal = totalBeforeWindow;
  for (let i = 0; i < 30; i++) {
    const d = new Date(start.getTime() + i * dayMs);
    const key = d.toISOString().slice(0, 10); // yyyy-MM-dd
    const newUsers = byDate.get(key) ?? 0;
    runningTotal += newUsers;
    daily.push({ date: key, newUsers, totalUsers: runningTotal });
  }

  res.json({
    totalUsers,
    activeLast7Days,
    daily,
  });
};


