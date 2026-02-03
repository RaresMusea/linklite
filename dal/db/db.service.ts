import { pingDb } from '@/dal/db/db.repo';
import { ReadinessError } from '@/lib/errors/ReadinessError';
import { logger } from '@/lib/logging/logger';
import { withTimeout } from '@/lib/timeouts';

const log = logger.with({ component: 'db.service.checkDbReachable' });

export async function checkDbReachable(timeoutMs = 2000): Promise<void> {
    try {
        await withTimeout(pingDb(), timeoutMs);
    } catch (err) {
        log.error('Database not reachable', { err, timeoutMs });
        throw new ReadinessError('database', 'Database not reachable');
    }
}
