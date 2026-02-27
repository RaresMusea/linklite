import { getEnvNumber } from '@/lib/utils';
import { withRedis } from '@/lib/redis/redis';

export type RateLimitResult = { ok: true; remaining: number } | { ok: false; retryAfterSec: number };

export type ShorteningRateLimitOptions = {
    ipHash: string;
    limit?: number;
    windowSec?: number;
};

export async function checkShortenIpRateLimit(options: ShorteningRateLimitOptions): Promise<RateLimitResult | null> {
    const limit = options.limit ?? getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 10);
    const windowSec = options.windowSec ?? getEnvNumber('RATE_LIMIT_WINDOW_SECONDS', 60);

    const keyBase = `shorten:ip:${options.ipHash}`;
    const nowMs = Date.now();
    const bucket = Math.floor(nowMs / 1000 / windowSec);
    const key = `rl:${keyBase}:${bucket}`;

    return await withRedis(async (redis) => {
        const count = await redis.incr(key);

        if (count === 1) {
            await redis.expire(key, windowSec + 2);
        }

        if (count > limit) {
            const nextWindowStartSec = (bucket + 1) * windowSec;
            const nowSec = Math.floor(nowMs / 1000);
            return { ok: false, retryAfterSec: Math.max(1, nextWindowStartSec - nowSec) };
        }

        return { ok: true, remaining: Math.max(0, limit - count) };
    });
}
