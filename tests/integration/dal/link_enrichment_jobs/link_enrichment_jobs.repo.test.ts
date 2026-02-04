import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { LinkEnrichmentJobStatus } from '@/generated/prisma/enums';
import { upsertLinkEnrichmentJob } from '@/dal/link_enrichment_jobs/link_enrichment_job.repo';
import { resetDb } from '@/tests/helpers/db';

let testLinkId: string;

describe('Link Enrichment Jobs Repository Integration Tests', () => {
    beforeEach(async () => {
        await resetDb();

        const link = await prisma.link.create({
            data: {
                slug: 'test-link',
                targetUrl: 'https://example.com',
            },
        });

        testLinkId = link.id;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Upsert Link Enrichment Job', () => {
        it('Should create a new job when none exists', async () => {
            // Act
            await upsertLinkEnrichmentJob(testLinkId);

            // Assert
            const job = await prisma.linkEnrichmentJob.findUnique({
                where: { linkId: testLinkId },
            });

            expect(job).not.toBeNull();
            expect(job?.linkId).toBe(testLinkId);
            expect(job?.status).toBe(LinkEnrichmentJobStatus.PENDING);
            expect(job?.attempts).toBe(0);
            expect(job?.lastError).toBeNull();
            expect(job?.lockedUntil).toBeNull();
            expect(job?.runAfter).toBeInstanceOf(Date);
        });

        it('Should reset status, runAfter, and lock while preserving attempts and lastError', async () => {
            // Arrange
            vi.useFakeTimers();
            const now = new Date('2024-01-01T10:00:00Z');
            vi.setSystemTime(now);

            await prisma.linkEnrichmentJob.create({
                data: {
                    linkId: testLinkId,
                    status: LinkEnrichmentJobStatus.ERROR,
                    runAfter: new Date('2023-12-31T10:00:00Z'),
                    lockedUntil: new Date('2024-01-01T11:00:00Z'),
                    attempts: 2,
                    lastError: 'previous failure',
                },
            });

            // Act
            await upsertLinkEnrichmentJob(testLinkId);

            // Assert
            const job = await prisma.linkEnrichmentJob.findUnique({
                where: { linkId: testLinkId },
            });

            expect(job?.status).toBe(LinkEnrichmentJobStatus.PENDING);
            expect(job?.runAfter?.getTime()).toBe(now.getTime());
            expect(job?.lockedUntil).toBeNull();
            expect(job?.attempts).toBe(2);
            expect(job?.lastError).toBe('previous failure');
        });

        it('Should handle concurrent upserts', async () => {
            const promises = Array(5)
                .fill(null)
                .map(() => upsertLinkEnrichmentJob(testLinkId));

            await Promise.all(promises);

            const jobs = await prisma.linkEnrichmentJob.findMany({
                where: { linkId: testLinkId },
            });

            expect(jobs).toHaveLength(1);
        });
    });
});
