import { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { OAuth2Client } from 'google-auth-library';

function signJwt(user: { id: string; name?: string; email?: string; role?: string }) {
  const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
  return jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, secret, { expiresIn: '7d' });
}

export const register: RequestHandler = async (req, res) => {
  const { email, name, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ message: 'Email & password required' });
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ message: 'Email already exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, name: name ?? email.split('@')[0], passwordHash, provider: 'local' });
  const userDto = { id: user.id, email: user.email, name: user.name, provider: user.provider, picture: user.picture, role: user.role };
  const token = signJwt(userDto);
  return res.json({ user: userDto, token });
};

export const login: RequestHandler = async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = await User.findOne({ email });
  if (!user || !user.passwordHash) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await (await import('bcryptjs')).compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  const userDto = { id: user.id, email: user.email, name: user.name, provider: user.provider, picture: user.picture, role: user.role };
  const token = signJwt(userDto);
  return res.json({ user: userDto, token });
};

export const googleSignIn: RequestHandler = async (req, res) => {
  // Expect Google ID token from client (Google Identity Services)
  const { credential } = req.body ?? {};
  if (!credential) return res.status(400).json({ message: 'credential required' });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(500).json({ message: 'server_not_configured' });

  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken: String(credential), audience: clientId });
    const payload = ticket.getPayload();
    const email = payload?.email;
    const name = payload?.name || (email ? email.split('@')[0] : 'User');
    const picture = payload?.picture;
    if (!email) return res.status(401).json({ message: 'unauthorized' });

    // Allow all emails if no allowlist is configured.
    // If ALLOWED_GOOGLE_EMAIL is set, support comma-separated list and domain patterns like '@example.com'.
    const allowEnv = (process.env.ALLOWED_GOOGLE_EMAIL || '').trim();
    if (allowEnv) {
      const emailLc = email.toLowerCase();
      const items = allowEnv.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      const domain = emailLc.substring(emailLc.indexOf('@'));
      const allowed = items.some((it) => it === emailLc || (it.startsWith('@') && it === domain));
      if (!allowed) return res.status(403).json({ message: 'forbidden' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, name, provider: 'google', picture });
    }
    const userDto = { id: user.id, email: user.email, name: user.name, provider: user.provider, picture: user.picture, role: user.role };
    const token = signJwt(userDto);
    return res.json({ user: userDto, token });
  } catch (e) {
    return res.status(401).json({ message: 'invalid_credential' });
  }
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


