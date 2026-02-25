// lib/redis.ts
import { createClient } from 'redis';
import { logger } from '@/lib/logging/logger';

type RedisClient = ReturnType<typeof createClient>;
type RedisFailStrategy = 'failOpen' | 'failClosed';

const redisLog = logger.component('lib.redis').child(undefined, ['lib', 'redis']);

declare global {
    var __redisClient: RedisClient | undefined;
    var __redisClientPromise: Promise<RedisClient> | undefined;
}

const REDIS_FAIL_STRATEGY: RedisFailStrategy = (process.env.REDIS_FAIL_STRATEGY as RedisFailStrategy) ?? 'failOpen';

function getRedisUrl(): string | null {
    const url = process.env.REDIS_URL ?? null;
    return url && url.trim().length > 0 ? url : null;
}

function sanitizeRedisError(err: unknown): string {
    if (err instanceof Error) return err.message;
    return 'Unknown Redis error';
}

function createRedisClientOrThrow(): RedisClient {
    const url = getRedisUrl();
    if (!url) {
        redisLog.error('Unable to create redis client due to missing REDIS_URL environment');
        throw new Error('REDIS_URL is not set');
    }

    const client = createClient({
        url,
        socket: {
            reconnectStrategy: (retries) => {
                // max ~2s
                const delay = Math.min(2000, 50 * 2 ** retries);
                return delay;
            },
        },
    });

    client.on('error', (err) => {
        redisLog.error(`Error: ${sanitizeRedisError(err)}`);
    });

    client.on('reconnecting', () => {
        redisLog.warn('Redis reconnecting...');
    });

    client.on('ready', () => {
        redisLog.info('Redis ready');
    });

    return client;
}

async function connectOnce(client: RedisClient): Promise<RedisClient> {
    if (client.isOpen) return client;
    try {
        await client.connect();
        return client;
    } catch (err) {
        redisLog.error(`Redis connection failed.\nReason: ${sanitizeRedisError(err)}`);
        throw err;
    }
}

/**
 * Singleton accessor.
 * Creates one REDIS client per runtime/process. On the dev mode, it keeps on globalThis between HMR reload.
 */
export async function getRedis(): Promise<RedisClient> {
    if (globalThis.__redisClient && globalThis.__redisClient.isOpen) {
        return globalThis.__redisClient;
    }

    if (globalThis.__redisClientPromise) {
        return globalThis.__redisClientPromise;
    }

    const client = globalThis.__redisClient ?? createRedisClientOrThrow();
    globalThis.__redisClient = client;

    globalThis.__redisClientPromise = connectOnce(client)
        .then((c) => c)
        .finally(() => {
            globalThis.__redisClientPromise = undefined;
        });

    return globalThis.__redisClientPromise;
}

/**
 * Helper for "safe usage" with fail-open / fail-closed.
 */
export async function withRedis<T>(fn: (redis: RedisClient) => Promise<T>): Promise<T | null> {
    try {
        const redis = await getRedis();
        return await fn(redis);
    } catch (err) {
        redisLog.error(`Redis operation failed: ${sanitizeRedisError(err)}`);

        if (REDIS_FAIL_STRATEGY === 'failClosed') {
            throw err;
        }
        // failOpen => the caller decides the fallback
        return null;
    }
}
