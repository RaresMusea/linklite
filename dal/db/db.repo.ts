import { prisma } from '@/lib/prisma';

export async function pingDb(): Promise<void> {
    await prisma.$queryRaw`SELECT 1`;
}
