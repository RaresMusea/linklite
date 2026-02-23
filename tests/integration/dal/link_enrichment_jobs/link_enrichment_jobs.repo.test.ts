import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { LinkEnrichmentJobStatus } from '@/generated/prisma/enums';
import {
    claimNextLinkEnrichmentJob,
    markLinkEnrichmentJobAsDone,
    requeueLinkEnrichmentJob,
    upsertLinkEnrichmentJob,
} from '@/dal/link_enrichment_jobs/link_enrichment_jobs.repo';
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

        it('Should handle concurrent upserts and keep update semantics', async () => {
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
                    attempts: 3,
                    lastError: 'previous failure',
                },
            });

            // Act
            await Promise.all(
                Array(5)
                    .fill(null)
                    .map(() => upsertLinkEnrichmentJob(testLinkId)),
            );

            // Assert
            const jobs = await prisma.linkEnrichmentJob.findMany({
                where: { linkId: testLinkId },
            });

            expect(jobs).toHaveLength(1);

            const job = jobs[0];
            expect(job.status).toBe(LinkEnrichmentJobStatus.PENDING);
            expect(job.runAfter.getTime()).toBe(now.getTime());
            expect(job.lockedUntil).toBeNull();
            expect(job.attempts).toBe(3);
            expect(job.lastError).toBe('previous failure');
        });
    });

    describe('Claim Next Link Enrichment Job', () => {
        it('Should claim the next PENDING job and update its state', async () => {
            // Arrange
            vi.useFakeTimers();
            const now = new Date('2024-01-01T10:00:00Z');
            vi.setSystemTime(now);

            const job = await prisma.linkEnrichmentJob.create({
                data: {
                    linkId: testLinkId,
                    status: LinkEnrichmentJobStatus.PENDING,
                    runAfter: now,
                    attempts: 0,
                    lastError: 'previous error',
                },
            });

            // Act
            const claimed = await claimNextLinkEnrichmentJob();

            // Assert
            expect(claimed).not.toBeNull();
            expect(claimed?.id).toBe(job.id);
            expect(claimed?.linkId).toBe(testLinkId);
            expect(claimed?.targetUrl).toBe('https://example.com');
            expect(claimed?.attempts).toBe(1);

            const updatedJob = await prisma.linkEnrichmentJob.findUnique({
                where: { id: job.id },
            });

            expect(updatedJob?.status).toBe(LinkEnrichmentJobStatus.RUNNING);
            expect(updatedJob?.attempts).toBe(1);
            expect(updatedJob?.lastError).toBeNull();
            expect(updatedJob?.lockedUntil).toBeInstanceOf(Date);
            expect(updatedJob?.lockedUntil!.getTime()).toBe(now.getTime() + 30_000);
        });

        it('Should return null when no eligible jobs exist', async () => {
            // Arrange
            vi.useFakeTimers();
            const now = new Date('2024-01-01T10:00:00Z');
            vi.setSystemTime(now);

            await prisma.linkEnrichmentJob.create({
                data: {
                    linkId: testLinkId,
                    status: LinkEnrichmentJobStatus.PENDING,
                    runAfter: new Date('2024-01-01T10:01:00Z'),
                },
            });

            // Act
            const claimed = await claimNextLinkEnrichmentJob();

            // Assert
            expect(claimed).toBeNull();
        });

        it('Should reclaim a stale RUNNING job', async () => {
            // Arrange
            vi.useFakeTimers();
            const now = new Date('2024-01-01T10:00:00Z');
            vi.setSystemTime(now);

            await prisma.linkEnrichmentJob.create({
                data: {
                    linkId: testLinkId,
                    status: LinkEnrichmentJobStatus.RUNNING,
                    runAfter: now,
                    lockedUntil: new Date('2024-01-01T09:59:40Z'),
                    attempts: 1,
                },
            });

            // Act
            const claimed = await claimNextLinkEnrichmentJob();

            // Assert
            expect(claimed).not.toBeNull();
            expect(claimed?.attempts).toBe(2);
        });

        it('Should prioritize the earliest runAfter', async () => {
            // Arrange
            vi.useFakeTimers();
            const now = new Date('2024-01-01T10:00:00Z');
            vi.setSystemTime(now);

            const linkA = await prisma.link.create({
                data: {
                    slug: 'test-link-a',
                    targetUrl: 'https://example.com/a',
                },
            });

            await prisma.linkEnrichmentJob.create({
                data: {
                    linkId: linkA.id,
                    status: LinkEnrichmentJobStatus.PENDING,
                    runAfter: new Date('2024-01-01T09:59:59Z'),
                },
            });

            await prisma.linkEnrichmentJob.create({
                data: {
                    linkId: testLinkId,
                    status: LinkEnrichmentJobStatus.PENDING,
                    runAfter: new Date('2024-01-01T09:59:58Z'),
                },
            });

            // Act
            const claimed = await claimNextLinkEnrichmentJob();

            // Assert
            expect(claimed?.linkId).toBe(testLinkId);
        });
    });

    describe('Mark Link Enrichment Job As Done', () => {
        it('Should mark the job as DONE and clear lock and error', async () => {
            // Arrange
            const job = await prisma.linkEnrichmentJob.create({
                data: {
                    linkId: testLinkId,
                    status: LinkEnrichmentJobStatus.RUNNING,
                    lockedUntil: new Date('2024-01-01T10:10:00Z'),
                    lastError: 'previous error',
                    attempts: 2,
                },
            });

            // Act
            await markLinkEnrichmentJobAsDone(job.id);

            // Assert
            const updatedJob = await prisma.linkEnrichmentJob.findUnique({
                where: { id: job.id },
            });

            expect(updatedJob?.status).toBe(LinkEnrichmentJobStatus.DONE);
            expect(updatedJob?.lockedUntil).toBeNull();
            expect(updatedJob?.lastError).toBeNull();
            expect(updatedJob?.attempts).toBe(2);
        });
    });

    describe('Requeue Link Enrichment Job', () => {
        it('Should set status to PENDING, clear lock, and persist error string', async () => {
            // Arrange
            const job = await prisma.linkEnrichmentJob.create({
                data: {
                    linkId: testLinkId,
                    status: LinkEnrichmentJobStatus.RUNNING,
                    lockedUntil: new Date('2024-01-01T10:10:00Z'),
                    lastError: null,
                    attempts: 2,
                },
            });

            const runAfter = new Date('2024-01-02T10:00:00Z');

            // Act
            await requeueLinkEnrichmentJob({
                jobId: job.id,
                attempts: 2,
                error: 'boom',
                runAfter,
            });

            // Assert
            const updatedJob = await prisma.linkEnrichmentJob.findUnique({
                where: { id: job.id },
            });

            expect(updatedJob?.status).toBe(LinkEnrichmentJobStatus.PENDING);
            expect(updatedJob?.lockedUntil).toBeNull();
            expect(updatedJob?.lastError).toBe('boom');
            expect(updatedJob?.runAfter?.getTime()).toBe(runAfter.getTime());
        });

        it('Should compute runAfter using exponential backoff when not provided', async () => {
            // Arrange
            vi.useFakeTimers();
            const now = new Date('2024-01-01T10:00:00Z');
            vi.setSystemTime(now);

            const job = await prisma.linkEnrichmentJob.create({
                data: {
                    linkId: testLinkId,
                    status: LinkEnrichmentJobStatus.RUNNING,
                    lockedUntil: new Date('2024-01-01T10:10:00Z'),
                    attempts: 2,
                },
            });

            // Act
            await requeueLinkEnrichmentJob({
                jobId: job.id,
                attempts: 2,
                error: new Error('timeout'),
            });

            // Assert
            const updatedJob = await prisma.linkEnrichmentJob.findUnique({
                where: { id: job.id },
            });

            const expectedRunAfter = new Date(now.getTime() + 4 * 60_000);
            expect(updatedJob?.runAfter?.getTime()).toBe(expectedRunAfter.getTime());
            expect(updatedJob?.lastError).toBe('timeout');
            expect(updatedJob?.lockedUntil).toBeNull();
            expect(updatedJob?.status).toBe(LinkEnrichmentJobStatus.PENDING);
        });

        it('Should stringify non-error values when setting lastError', async () => {
            // Arrange
            const job = await prisma.linkEnrichmentJob.create({
                data: {
                    linkId: testLinkId,
                    status: LinkEnrichmentJobStatus.RUNNING,
                    attempts: 1,
                },
            });

            // Act
            await requeueLinkEnrichmentJob({
                jobId: job.id,
                attempts: 1,
                error: 404,
                runAfter: new Date('2024-01-02T10:00:00Z'),
            });

            // Assert
            const updatedJob = await prisma.linkEnrichmentJob.findUnique({
                where: { id: job.id },
            });

            expect(updatedJob?.lastError).toBe('404');
        });
    });
});
