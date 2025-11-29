import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

type JwtClaims = {
  id: string;
  name?: string;
  email?: string;
  role?: 'user' | 'admin';
  status?: 'active' | 'locked';
};

export const requireAuth: RequestHandler = (req, res, next) => {
  try {
    const auth = (req.headers['authorization'] || '').toString();
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
    if (!token) return res.status(401).json({ message: 'unauthorized' });
    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const decoded = jwt.verify(String(token), secret) as JwtClaims;
    if (!decoded?.id) return res.status(401).json({ message: 'unauthorized' });
    const user = {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role ?? 'user',
      status: decoded.status ?? 'active',
    };
    if (user.status === 'locked') {
      return res.status(403).json({ message: 'account_locked' });
    }
    (req as any).user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'unauthorized' });
  }
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  const user = (req as any).user as { role?: string } | undefined;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: 'forbidden' });
  }
  next();
};
