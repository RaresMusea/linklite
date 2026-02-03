import { pingDb } from '@/dal/db/db.repo';
import { ReadinessError } from '@/lib/errors/ReadinessError';
import { logger } from '@/lib/logging/logger';

const log = logger.with({ component: 'db.service.checkDbReachable' });

export async function checkDbReachable(): Promise<void> {
    try {
        await pingDb();
    } catch {
        log.error(`Database not reachable!`);
        throw new ReadinessError('database', 'Database not reachable');
    }
}
