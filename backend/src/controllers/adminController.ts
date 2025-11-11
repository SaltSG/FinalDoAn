import { RequestHandler } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { UserResults } from '../models/UserResults';
import { Deadline } from '../models/Deadline';
import { Curriculum } from '../models/Curriculum';
import { ChatMessage } from '../models/ChatMessage';

export const getStats: RequestHandler = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalStudents = await User.countDocuments({ role: 'user' });
    const totalDeadlines = await Deadline.countDocuments();
    const completedDeadlines = await Deadline.countDocuments({ status: 'completed' });
    const ongoingDeadlines = await Deadline.countDocuments({ status: 'ongoing' });
    const overdueDeadlines = await Deadline.countDocuments({ status: 'overdue' });
    const totalMessages = await ChatMessage.countDocuments();
    const totalResults = await UserResults.countDocuments();
    
    const devCurriculum = await Curriculum.findOne({ specialization: 'dev' });
    const designCurriculum = await Curriculum.findOne({ specialization: 'design' });
    
    const devStudents = await UserResults.countDocuments({ specialization: 'dev' });
    const designStudents = await UserResults.countDocuments({ specialization: 'design' });

    // Users by provider
    const localUsers = await User.countDocuments({ provider: 'local' });
    const googleUsers = await User.countDocuments({ provider: 'google' });

    // Recent users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    return res.json({
      users: {
        total: totalUsers,
        admins: totalAdmins,
        students: totalStudents,
        local: localUsers,
        google: googleUsers,
        recent: recentUsers,
      },
      deadlines: {
        total: totalDeadlines,
        completed: completedDeadlines,
        ongoing: ongoingDeadlines,
        overdue: overdueDeadlines,
      },
      curriculum: {
        dev: {
          exists: !!devCurriculum,
          students: devStudents,
        },
        design: {
          exists: !!designCurriculum,
          students: designStudents,
        },
      },
      chat: {
        totalMessages,
      },
      results: {
        total: totalResults,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const listUsers: RequestHandler = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const role = String(req.query.role || '').trim();

    const query: any = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }
    if (role && (role === 'admin' || role === 'user')) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments(query);

    return res.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getUser: RequestHandler = async (req, res) => {
  try {
    const id = String(req.params.id || '');
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'invalid user id' });
    }

    const user = await User.findById(id).select('-passwordHash').lean();
    if (!user) {
      return res.status(404).json({ message: 'user not found' });
    }

    const results = await UserResults.findOne({ user: id }).lean();
    const deadlinesCount = await Deadline.countDocuments({ user: id });
    const messagesCount = await ChatMessage.countDocuments({ userId: id });

    return res.json({
      user,
      stats: {
        hasResults: !!results,
        deadlinesCount,
        messagesCount,
        specialization: results?.specialization,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateUser: RequestHandler = async (req, res) => {
  try {
    const id = String(req.params.id || '');
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'invalid user id' });
    }

    const { name, role, email } = req.body || {};
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'user not found' });
    }

    if (typeof name === 'string') user.name = name;
    if (role === 'admin' || role === 'user') user.role = role;
    if (typeof email === 'string' && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ message: 'email already exists' });
      }
      user.email = email;
    }

    await user.save();
    const userDto = user.toObject();
    delete (userDto as any).passwordHash;

    return res.json({ ok: true, user: userDto });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteUser: RequestHandler = async (req, res) => {
  try {
    const id = String(req.params.id || '');
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'invalid user id' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'user not found' });
    }

    // Don't allow deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'cannot delete last admin' });
      }
    }

    // Delete related data
    await UserResults.deleteOne({ user: id });
    await Deadline.deleteMany({ user: id });
    await ChatMessage.deleteMany({ userId: id });

    await User.deleteOne({ _id: id });

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAllDeadlines: RequestHandler = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const status = String(req.query.status || '').trim();

    const query: any = {};
    if (status && ['upcoming', 'ongoing', 'overdue', 'completed'].includes(status)) {
      query.status = status;
    }

    const deadlines = await Deadline.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Deadline.countDocuments(query);

    return res.json({
      data: deadlines,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getChatStats: RequestHandler = async (req, res) => {
  try {
    const totalMessages = await ChatMessage.countDocuments();
    const totalWithAttachments = await ChatMessage.countDocuments({ attachment: { $exists: true, $ne: null } });
    
    const roomStats = await ChatMessage.aggregate([
      {
        $group: {
          _id: '$room',
          count: { $sum: 1 },
          withAttachments: {
            $sum: { $cond: [{ $ifNull: ['$attachment', false] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Recent messages - userId is a string, not ObjectId, so we can't populate
    // Instead, we'll fetch user info separately if needed
    const recentMessages = await ChatMessage.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      total: totalMessages,
      withAttachments: totalWithAttachments,
      rooms: roomStats,
      recent: recentMessages,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// Special endpoint to set first admin (only works when no admin exists)
export const setFirstAdmin: RequestHandler = async (req, res) => {
  try {
    // Check if any admin exists
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount > 0) {
      return res.status(403).json({ message: 'Admin already exists. Use admin panel to manage users.' });
    }

    // Require secret key from environment
    const secretKey = process.env.ADMIN_SETUP_SECRET || 'change-me-in-production';
    const providedKey = String(req.body?.secretKey || req.headers['x-admin-secret'] || '');
    
    if (providedKey !== secretKey) {
      return res.status(401).json({ message: 'Invalid secret key' });
    }

    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: 'email required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'user not found' });
    }

    user.role = 'admin';
    await user.save();

    const userDto = user.toObject();
    delete (userDto as any).passwordHash;

    return res.json({ 
      ok: true, 
      message: 'User set as admin successfully',
      user: userDto 
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
