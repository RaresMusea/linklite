import { PrismaPg } from '@prisma/adapter-pg';
import { env } from 'prisma/config';
import { PrismaClient } from '@/generated/prisma/client';

const connectionString = env('DATABASE_URL');
const adapter = new PrismaPg({ connectionString });

type GlobalWithPrisma = typeof globalThis & {
    __prisma?: PrismaClient;
};

const g = globalThis as GlobalWithPrisma;

export const prisma =
    g.__prisma ??
    new PrismaClient({
        adapter,
    });

if (process.env.NODE_ENV !== 'production') {
    g.__prisma = prisma;
}
