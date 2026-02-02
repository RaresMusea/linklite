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