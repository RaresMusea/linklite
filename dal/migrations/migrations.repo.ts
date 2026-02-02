import { prisma } from '@/lib/prisma';

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
