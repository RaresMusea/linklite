import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { createClient } from 'redis';

const { createClientMock, logFns } = vi.hoisted(() => {
    return {
        createClientMock: vi.fn(),
        logFns: {
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn(),
        },
    };
});

vi.mock('redis', () => ({
    createClient: createClientMock,
}));

vi.mock('@/lib/logging/logger', () => ({
    logger: {
        component: vi.fn(() => ({
            child: vi.fn(() => logFns),
        })),
    },
}));

type FakeClient = {
    isOpen: boolean;
    connect: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
};
type RedisClient = ReturnType<typeof createClient>;

const ORIGINAL_REDIS_URL = process.env.REDIS_URL;
const ORIGINAL_REDIS_FAIL_STRATEGY = process.env.REDIS_FAIL_STRATEGY;

function makeClient(connectImpl?: () => Promise<void>): FakeClient {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const connect = vi.fn(async () => {
        if (connectImpl) {
            await connectImpl();
            return;
        }
        client.isOpen = true;
    });
    const client: FakeClient = {
        isOpen: false,
        connect,
        on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
            handlers.set(event, handler);
            return client;
        }),
    };
    return client;
}

function asRedisClient(client: FakeClient): RedisClient {
    return client as unknown as RedisClient;
}

async function importRedisModule() {
    vi.resetModules();
    return await import('@/lib/redis/redis');
}

function restoreEnv() {
    if (ORIGINAL_REDIS_URL === undefined) {
        delete process.env.REDIS_URL;
    } else {
        process.env.REDIS_URL = ORIGINAL_REDIS_URL;
    }

    if (ORIGINAL_REDIS_FAIL_STRATEGY === undefined) {
        delete process.env.REDIS_FAIL_STRATEGY;
    } else {
        process.env.REDIS_FAIL_STRATEGY = ORIGINAL_REDIS_FAIL_STRATEGY;
    }
}

describe('Redis utils tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete globalThis.__redisClient;
        delete globalThis.__redisClientPromise;
        restoreEnv();
    });

    afterEach(() => {
        delete globalThis.__redisClient;
        delete globalThis.__redisClientPromise;
        restoreEnv();
    });

    it('Throws when REDIS_URL is missing', async () => {
        delete process.env.REDIS_URL;
        const { getRedis } = await importRedisModule();

        await expect(getRedis()).rejects.toThrow('REDIS_URL is not set');
        expect(createClientMock).not.toHaveBeenCalled();
        expect(logFns.error).toHaveBeenCalledWith('Unable to create redis client due to missing REDIS_URL environment');
    });

    it('Connects once and returns the same singleton on concurrent calls', async () => {
        process.env.REDIS_URL = 'redis://localhost:6379';
        const client = makeClient();
        createClientMock.mockReturnValue(asRedisClient(client));

        const { getRedis } = await importRedisModule();
        const [first, second] = await Promise.all([getRedis(), getRedis()]);

        expect(first).toBe(client);
        expect(second).toBe(client);
        expect(createClientMock).toHaveBeenCalledTimes(1);
        expect(client.connect).toHaveBeenCalledTimes(1);
    });

    it('Returns already-open global client without creating or connecting', async () => {
        process.env.REDIS_URL = 'redis://localhost:6379';
        const client = makeClient();
        client.isOpen = true;
        globalThis.__redisClient = asRedisClient(client);

        const { getRedis } = await importRedisModule();
        const redis = await getRedis();

        expect(redis).toBe(client);
        expect(createClientMock).not.toHaveBeenCalled();
        expect(client.connect).not.toHaveBeenCalled();
    });

    it('Registers redis callbacks for error/reconnecting/ready events', async () => {
        process.env.REDIS_URL = 'redis://localhost:6379';
        const handlers = new Map<string, (...args: unknown[]) => void>();
        const client = makeClient();
        client.on = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
            handlers.set(event, handler);
            return client;
        });
        createClientMock.mockReturnValue(asRedisClient(client));

        const { getRedis } = await importRedisModule();
        await getRedis();

        handlers.get('error')?.('not-an-error');
        handlers.get('reconnecting')?.();
        handlers.get('ready')?.();

        expect(client.on).toHaveBeenCalledWith('error', expect.any(Function));
        expect(client.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
        expect(client.on).toHaveBeenCalledWith('ready', expect.any(Function));
        expect(logFns.error).toHaveBeenCalledWith('Error: Unknown Redis error');
        expect(logFns.warn).toHaveBeenCalledWith('Redis reconnecting...');
        expect(logFns.info).toHaveBeenCalledWith('Redis ready');
    });

    it('WithRedis returns null in failOpen mode when redis fails', async () => {
        process.env.REDIS_URL = 'redis://localhost:6379';
        process.env.REDIS_FAIL_STRATEGY = 'failOpen';
        const client = makeClient(async () => {
            throw new Error('connect failed');
        });
        createClientMock.mockReturnValue(asRedisClient(client));
        const fn = vi.fn(async () => 'ok');

        const { withRedis } = await importRedisModule();
        const result = await withRedis(fn);

        expect(result).toBeNull();
        expect(fn).not.toHaveBeenCalled();
    });

    it('WithRedis throws in failClosed mode when redis fails', async () => {
        process.env.REDIS_URL = 'redis://localhost:6379';
        process.env.REDIS_FAIL_STRATEGY = 'failClosed';
        const err = new Error('connect failed');
        const client = makeClient(async () => {
            throw err;
        });
        createClientMock.mockReturnValue(asRedisClient(client));
        const fn = vi.fn(async () => 'ok');

        const { withRedis } = await importRedisModule();

        await expect(withRedis(fn)).rejects.toThrow('connect failed');
        expect(fn).not.toHaveBeenCalled();
    });
});
