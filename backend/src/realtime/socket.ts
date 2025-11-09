import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createAdapter } from '@socket.io/redis-adapter';
import { createRedisClients } from '../config/redis';
import { ChatMessage } from '../models/ChatMessage';

type JwtClaims = { id: string; name?: string; email?: string };

type ServerToClientEvents = {
  'chat:message': (payload: any) => void;
  'chat:typing': (payload: { room: string; userId: string; userName?: string; typing: boolean }) => void;
  'chat:read': (payload: { room: string; messageId: string; readerId: string }) => void;
  'presence:state': (payload: { userId: string; online: boolean }) => void;
};

type ClientToServerEvents = {
  'chat:send': (payload: { room?: string; content: string }, cb?: (err?: string) => void) => void;
  'chat:join': (room: string, cb?: (ok: boolean) => void) => void;
  'chat:leave': (room: string, cb?: (ok: boolean) => void) => void;
  'chat:typing': (payload: { room: string; typing: boolean }) => void;
  'chat:read': (payload: { room: string; messageId: string }) => void;
};

export async function initializeSocket(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: true, credentials: true },
    path: '/socket.io',
  });

  // Redis adapter (optional via REDIS_URL) + optional client for rate-limit
  const redisUrl = process.env.REDIS_URL;
  let rateLimitRedis: any = null;
  if (redisUrl) {
    const { pubClient, subClient } = createRedisClients(redisUrl);
    // prevent unhandled error events from crashing
    pubClient.on('error', () => {});
    subClient.on('error', () => {});
    try {
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      rateLimitRedis = pubClient;
      // eslint-disable-next-line no-console
      console.log('[socket] redis adapter connected');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[socket] redis adapter unavailable, running in memory');
      try { await pubClient.disconnect(); } catch {}
      try { await subClient.disconnect(); } catch {}
    }
  } else {
    // eslint-disable-next-line no-console
    console.log('[socket] redis adapter disabled (no REDIS_URL)');
  }

  // JWT auth middleware
  io.use((socket, next) => {
    try {
      const token = (socket.handshake.auth as any)?.token || (socket.handshake.query as any)?.token;
      if (!token) return next(new Error('unauthorized'));
      const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
      const decoded = jwt.verify(String(token), secret) as JwtClaims;
      if (!decoded?.id) return next(new Error('unauthorized'));
      (socket.data as any).user = { id: decoded.id, name: decoded.name, email: decoded.email };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  // Simple Redis-based rate limiting helpers
  async function checkRateLimit(userId: string, key: string, limit: number, windowSeconds: number) {
    if (!rateLimitRedis) return true; // no redis -> allow
    try {
      const redisKey = `rl:${key}:${userId}`;
      const current = await rateLimitRedis.incr(redisKey);
      if (current === 1) await rateLimitRedis.expire(redisKey, windowSeconds);
      return current <= limit;
    } catch {
      return true;
    }
  }

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    const user = (socket.data as any).user as { id: string; name?: string };
    const userId = user.id;

    // auto-join global
    socket.join('global');
    io.emit('presence:state', { userId, online: true });

    socket.on('chat:join', (room, cb) => {
      if (!room) return cb?.(false);
      socket.join(room);
      cb?.(true);
    });

    socket.on('chat:leave', (room, cb) => {
      if (!room) return cb?.(false);
      socket.leave(room);
      cb?.(true);
    });

    socket.on('chat:typing', async ({ room, typing }) => {
      const ok = await checkRateLimit(userId, 'typing', 10, 10);
      if (!ok) return;
      const userName = user.name;
      // emit to others in the room (avoid echoing to the sender)
      socket.to(room || 'global').emit('chat:typing', { room: room || 'global', userId, userName, typing: !!typing });
    });

    socket.on('chat:send', async ({ room, content }, cb) => {
      const text = (content || '').trim();
      if (!text) return cb?.('empty');
      const ok = await checkRateLimit(userId, 'message', 5, 1);
      if (!ok) return cb?.('rate_limited');
      try {
        const doc = await ChatMessage.create({ room: room || 'global', userId, userName: user.name, content: text });
        const payload = { _id: doc._id, room: doc.room, userId: doc.userId, userName: doc.userName, content: doc.content, createdAt: doc.createdAt };
        io.to(doc.room).emit('chat:message', payload);
        cb?.();
      } catch (e: any) {
        cb?.('server_error');
      }
    });

    socket.on('chat:read', ({ room, messageId }) => {
      // Broadcast ephemeral read event; server-side persistence handled via REST /api/chat/read
      if (!messageId) return;
      io.to(room || 'global').emit('chat:read', { room: room || 'global', messageId, readerId: userId });
    });

    socket.on('disconnect', () => {
      io.emit('presence:state', { userId, online: false });
    });
  });

  return io;
}


