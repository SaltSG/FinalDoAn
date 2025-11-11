import Redis from 'ioredis';

export type RedisClients = {
  pubClient: Redis;
  subClient: Redis;
};

export function createRedisClients(url?: string): RedisClients {
  const redisUrl = url || process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const pubClient = new Redis(redisUrl, { lazyConnect: true });
  const subClient = new Redis(redisUrl, { lazyConnect: true });
  return { pubClient, subClient };
}


