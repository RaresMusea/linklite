import { MigrationDetails } from '@/dal/migrations/migrations.types';
import { countPendingMigrations, getLastAppliedMigration } from '@/dal/migrations/migrations.repo';
import { logger } from '@/lib/logging/logger';
import { ReadinessError } from '@/lib/errors/ReadinessError';
import { checkDbReachable } from '@/dal/db/db.service';

const log = logger.with({ component: 'migrations.service' });

export async function checkDbMigrations(): Promise<MigrationDetails | null> {
    log.debug('Checking out for database migrations...');

    const pendingMigrations = await countPendingMigrations();

    if (pendingMigrations > 0) {
        log.error('Database has pending migrations', { pendingMigrations });
        throw new ReadinessError('migrations', `Database has ${pendingMigrations} unfinished migrations`);
    }

    const lastMigration = await getLastAppliedMigration();

    return lastMigration ?? null;
}

export async function checkReady() {
    await checkDbReachable();
    const migration = await checkDbMigrations();
    return { ok: true as const, migration };
}
