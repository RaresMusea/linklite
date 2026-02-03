import { prisma } from '@/lib/prisma';
import { MigrationDetails } from '@/dal/migrations/migrations.types';

export async function migrationsTableExists(): Promise<boolean> {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
    ) AS "exists"
  `;
    return rows?.[0]?.exists === true;
}

export async function countPendingMigrations(): Promise<number> {
    const tableExists = await migrationsTableExists();

    if (!tableExists) {
        return 0;
    }

    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM "_prisma_migrations"
        WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL
    `;
    return Number(rows?.[0]?.count ?? 0);
}

export async function countAppliedMigrations(): Promise<number> {
    const tableExists = await migrationsTableExists();

    if (!tableExists) {
        return 0;
    }

    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL AND "rolled_back_at" IS NULL
    `;

    return Number(rows?.[0]?.count ?? 0);
}

export async function getLastAppliedMigration(): Promise<MigrationDetails | null> {

    const tableExists = await migrationsTableExists();

    if (!tableExists) {
        return null;
    }

    const rows = await prisma.$queryRaw<
        Array<{
            migration_name: string | null;
            started_at: Date | null;
            finished_at: Date | null;
            applied_steps_count: number | null;
        }>
    >`
        SELECT "migration_name","started_at","finished_at","applied_steps_count"
        FROM "_prisma_migrations"
        WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL
        ORDER BY "finished_at" DESC
        LIMIT 1
    `;

    if (!rows?.[0]) return null;

    return {
        migrationName: rows[0].migration_name,
        startedAt: rows[0].started_at,
        finishedAt: rows[0].finished_at,
        appliedStepsCount: rows[0].applied_steps_count,
    };
}
