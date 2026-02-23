import { prisma } from '@/lib/prisma';

export async function resetDb(): Promise<void> {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "AnonActor" RESTART IDENTITY CASCADE;`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "DomainEnrichmentJob" RESTART IDENTITY CASCADE;`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "LinkEnrichmentJob" RESTART IDENTITY CASCADE;`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Link" RESTART IDENTITY CASCADE;`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Domain" RESTART IDENTITY CASCADE;`);
}
