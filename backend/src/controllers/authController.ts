import { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';

export const register: RequestHandler = async (req, res) => {
  const { email, name, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ message: 'Email & password required' });
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ message: 'Email already exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, name: name ?? email.split('@')[0], passwordHash, provider: 'local' });
  return res.json({ user: { id: user.id, email: user.email, name: user.name, provider: user.provider, picture: user.picture } });
};

export const login: RequestHandler = async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = await User.findOne({ email });
  if (!user || !user.passwordHash) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await (await import('bcryptjs')).compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  return res.json({ user: { id: user.id, email: user.email, name: user.name, provider: user.provider, picture: user.picture } });
};

export const googleSignIn: RequestHandler = async (req, res) => {
  const { email, name, picture } = req.body ?? {};
  if (!email) return res.status(400).json({ message: 'email required' });
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email, name: name ?? email.split('@')[0], provider: 'google', picture });
  }
  return res.json({ user: { id: user.id, email: user.email, name: user.name, provider: user.provider, picture: user.picture } });
};

export const resetPassword: RequestHandler = async (req, res) => {
  const { email, newPassword } = req.body ?? {};
  if (!email || !newPassword) return res.status(400).json({ message: 'email & newPassword required' });
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.passwordHash = await (await import('bcryptjs')).hash(newPassword, 10);
  await user.save();
  return res.json({ ok: true });
};


