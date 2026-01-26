import { describe, beforeEach, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { DomainEnrichmentJobStatus } from '@/generated/prisma/enums';
import {
    claimNextDomainEnrichmentJob,
    upsertDomainEnrichmentJob,
} from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.repo';

describe('Domain Enrichment Jobs repository integration tests', () => {
    describe('Upsert Domain Enrichment job', () => {
        const testDomainId = 'test-integration-domain-id';

        beforeAll(async () => {
            // Clean up any existing test data
            await prisma.domainEnrichmentJob.deleteMany({
                where: { domainId: testDomainId },
            });

            // Ensure test domain exists
            await prisma.domain.upsert({
                where: { id: testDomainId },
                create: {
                    id: testDomainId,
                    hostname: 'test-integration.example.com',
                },
                update: {},
            });
        });

        afterAll(async () => {
            // Clean up test data
            await prisma.domainEnrichmentJob.deleteMany({
                where: { domainId: testDomainId },
            });

            await prisma.domain.deleteMany({
                where: { id: testDomainId },
            });
        });

        beforeEach(async () => {
            // Ensure no job exists before each test
            await prisma.domainEnrichmentJob.deleteMany({
                where: { domainId: testDomainId },
            });
        });

        it('Should create a new job when none exists', async () => {
            // Arrange
            const input = {
                domainId: testDomainId,
                status: DomainEnrichmentJobStatus.PENDING,
            };

            // Act
            await upsertDomainEnrichmentJob(input);

            // Assert
            const job = await prisma.domainEnrichmentJob.findUnique({
                where: { domainId: testDomainId },
            });

            expect(job).not.toBeNull();
            expect(job?.domainId).toBe(testDomainId);
            expect(job?.status).toBe(DomainEnrichmentJobStatus.PENDING);
            expect(job?.attempts).toBe(0); // Default value
            expect(job?.lastError).toBeNull();
            expect(job?.runAfter).toBeInstanceOf(Date);
        });

        it('Should update existing job with new status', async () => {
            // Arrange - First create a job
            await prisma.domainEnrichmentJob.create({
                data: {
                    domainId: testDomainId,
                    status: DomainEnrichmentJobStatus.PENDING,
                },
            });

            const input = {
                domainId: testDomainId,
                status: DomainEnrichmentJobStatus.RUNNING,
            };

            // Act
            await upsertDomainEnrichmentJob(input);

            // Assert
            const job = await prisma.domainEnrichmentJob.findUnique({
                where: { domainId: testDomainId },
            });

            expect(job?.status).toBe(DomainEnrichmentJobStatus.RUNNING);
            // runAfter Should be updated to current time
            expect(job?.runAfter).toBeInstanceOf(Date);
        });

        it('Should maintain attempts count when updating status', async () => {
            // Arrange - Create job with attempts
            await prisma.domainEnrichmentJob.create({
                data: {
                    domainId: testDomainId,
                    status: DomainEnrichmentJobStatus.PENDING,
                    attempts: 3,
                    lastError: 'Previous error',
                },
            });

            const input = {
                domainId: testDomainId,
                status: DomainEnrichmentJobStatus.ERROR,
            };

            // Act
            await upsertDomainEnrichmentJob(input);

            // Assert
            const job = await prisma.domainEnrichmentJob.findUnique({
                where: { domainId: testDomainId },
            });

            expect(job?.status).toBe(DomainEnrichmentJobStatus.ERROR);
            // attempts and lastError Should remain unchanged
            expect(job?.attempts).toBe(3);
            expect(job?.lastError).toBe('Previous error');
        });

        it('Should handle concurrent upserts', async () => {
            // This test requires proper transaction handling in your implementation
            const input = {
                domainId: testDomainId,
                status: DomainEnrichmentJobStatus.PENDING,
            };

            // Execute multiple concurrent upserts
            const promises = Array(5)
                .fill(null)
                .map(() => upsertDomainEnrichmentJob(input));

            await Promise.all(promises);

            // Should still have only one record
            const jobs = await prisma.domainEnrichmentJob.findMany({
                where: { domainId: testDomainId },
            });

            expect(jobs.length).toBe(1);
        });
    });

    describe('Claim next domain enrichhment job', () => {
        let testDomainId1: string;
        let testDomainId2: string;
        let testDomainId3: string;

        beforeAll(async () => {
            // Create test domains
            const domain1 = await prisma.domain.create({
                data: {
                    hostname: 'claim-test-1.example.com',
                },
            });
            testDomainId1 = domain1.id;

            const domain2 = await prisma.domain.create({
                data: {
                    hostname: 'claim-test-2.example.com',
                },
            });
            testDomainId2 = domain2.id;

            const domain3 = await prisma.domain.create({
                data: {
                    hostname: 'claim-test-3.example.com',
                },
            });
            testDomainId3 = domain3.id;
        });

        afterAll(async () => {
            // Clean up all test data
            await prisma.domainEnrichmentJob.deleteMany({
                where: {
                    domainId: {
                        in: [testDomainId1, testDomainId2, testDomainId3],
                    },
                },
            });
            await prisma.domain.deleteMany({
                where: {
                    id: {
                        in: [testDomainId1, testDomainId2, testDomainId3],
                    },
                },
            });
        });

        beforeEach(async () => {
            // Clear all jobs before each test
            await prisma.domainEnrichmentJob.deleteMany({
                where: {
                    domainId: {
                        in: [testDomainId1, testDomainId2, testDomainId3],
                    },
                },
            });
        });

        it('Should claim the next PENDING job', async () => {
            // Arrange
            vi.useFakeTimers();
            const now = new Date('2024-01-01T10:00:00Z');
            vi.setSystemTime(now);

            // Create a PENDING job
            const job = await prisma.domainEnrichmentJob.create({
                data: {
                    domainId: testDomainId1,
                    status: DomainEnrichmentJobStatus.PENDING,
                    runAfter: now,
                    attempts: 0,
                },
            });

            // Act
            const claimed = await claimNextDomainEnrichmentJob();

            // Assert
            expect(claimed).not.toBeNull();
            expect(claimed?.id).toBe(job.id);
            expect(claimed?.domainId).toBe(testDomainId1);
            expect(claimed?.hostname).toBe('claim-test-1.example.com');
            expect(claimed?.attempts).toBe(1); // Should increment from 0 to 1

            // Verify job was updated in database
            const updatedJob = await prisma.domainEnrichmentJob.findUnique({
                where: { id: job.id },
            });

            expect(updatedJob?.status).toBe(DomainEnrichmentJobStatus.RUNNING);
            expect(updatedJob?.attempts).toBe(1);
            expect(updatedJob?.lockedUntil).toBeInstanceOf(Date);
            expect(updatedJob?.lockedUntil!.getTime()).toBe(now.getTime() + 2 * 60_000); // LEASE_MS = 2 minutes

            vi.useRealTimers();
        });

        it('Should claim the oldest runAfter job first', async () => {
            // Arrange
            vi.useFakeTimers();
            const now = new Date('2024-01-01T10:00:00Z');
            vi.setSystemTime(now);

            // Create jobs with different runAfter times
            await prisma.domainEnrichmentJob.create({
                data: {
                    domainId: testDomainId1,
                    status: DomainEnrichmentJobStatus.PENDING,
                    runAfter: new Date('2024-01-01T11:00:00Z'), // Later
                    attempts: 0,
                },
            });

            const job2 = await prisma.domainEnrichmentJob.create({
                data: {
                    domainId: testDomainId2,
                    status: DomainEnrichmentJobStatus.PENDING,
                    runAfter: new Date('2024-01-01T09:00:00Z'), // Earlier
                    attempts: 0,
                },
            });

            // Act
            const claimed = await claimNextDomainEnrichmentJob();

            // Assert - Should claim job2 because it has earlier runAfter
            expect(claimed).not.toBeNull();
            expect(claimed?.id).toBe(job2.id);
            expect(claimed?.domainId).toBe(testDomainId2);

            vi.useRealTimers();
        });

        it('Should not claim jobs with future runAfter', async () => {
            // Arrange
            vi.useFakeTimers();
            const now = new Date('2024-01-01T10:00:00Z');
            vi.setSystemTime(now);

            // Create job with future runAfter
            await prisma.domainEnrichmentJob.create({
                data: {
                    domainId: testDomainId1,
                    status: DomainEnrichmentJobStatus.PENDING,
                    runAfter: new Date('2024-01-01T11:00:00Z'), // 1 hour in future
                    attempts: 0,
                },
            });

            // Act
            const claimed = await claimNextDomainEnrichmentJob();

            // Assert
            expect(claimed).toBeNull();

            vi.useRealTimers();
        });

        it('Should claim stale RUNNING jobs (lockedUntil expired)', async () => {
            // Arrange
            vi.useFakeTimers();
            const now = new Date('2024-01-01T10:00:00Z');
            vi.setSystemTime(now);

            // Create a RUNNING job with expired lock
            const job = await prisma.domainEnrichmentJob.create({
                data: {
                    domainId: testDomainId1,
                    status: DomainEnrichmentJobStatus.RUNNING,
                    runAfter: now,
                    lockedUntil: new Date('2024-01-01T09:00:00Z'), // 1 hour ago (expired)
                    attempts: 2,
                },
            });

            // Act
            const claimed = await claimNextDomainEnrichmentJob();

            // Assert
            expect(claimed).not.toBeNull();
            expect(claimed?.id).toBe(job.id);
            expect(claimed?.attempts).toBe(3); // Should increment from 2 to 3

            // Verify job was updated
            const updatedJob = await prisma.domainEnrichmentJob.findUnique({
                where: { id: job.id },
            });

            expect(updatedJob?.status).toBe(DomainEnrichmentJobStatus.RUNNING);
            expect(updatedJob?.attempts).toBe(3);
            expect(updatedJob?.lockedUntil!.getTime()).toBe(now.getTime() + 2 * 60_000);

            vi.useRealTimers();
        });

        it('Should not claim fresh RUNNING jobs (lockedUntil not expired)', async () => {
            // Arrange
            vi.useFakeTimers();
            const now = new Date('2024-01-01T10:00:00Z');
            vi.setSystemTime(now);

            // Create a RUNNING job with active lock
            await prisma.domainEnrichmentJob.create({
                data: {
                    domainId: testDomainId1,
                    status: DomainEnrichmentJobStatus.RUNNING,
                    runAfter: now,
                    lockedUntil: new Date('2024-01-01T11:00:00Z'), // 1 hour in future (not expired)
                    attempts: 2,
                },
            });

            // Act
            const claimed = await claimNextDomainEnrichmentJob();

            // Assert
            expect(claimed).toBeNull();

            vi.useRealTimers();
        });

        it('Should not claim jobs with status other than PENDING or stale RUNNING', async () => {
            // Arrange
            vi.useFakeTimers();
            const now = new Date('2024-01-01T10:00:00Z');
            vi.setSystemTime(now);

            const statuses = [
                DomainEnrichmentJobStatus.ERROR,
                DomainEnrichmentJobStatus.DONE,
                DomainEnrichmentJobStatus.ERROR,
            ];

            for (const status of statuses) {
                await prisma.domainEnrichmentJob.create({
                    data: {
                        domainId: testDomainId1,
                        status,
                        runAfter: now,
                        attempts: 0,
                    },
                });

                // Act
                const claimed = await claimNextDomainEnrichmentJob();

                // Assert
                expect(claimed).toBeNull();

                // Clean for next iteration
                await prisma.domainEnrichmentJob.deleteMany({
                    where: { domainId: testDomainId1 },
                });
            }

            vi.useRealTimers();
        });

        it('Should return null when no jobs available', async () => {
            // Act
            const claimed = await claimNextDomainEnrichmentJob();

            // Assert
            expect(claimed).toBeNull();
        });

        it('Should handle concurrent claims correctly (only one gets it)', async () => {
            // Arrange
            vi.useFakeTimers();
            const now = new Date('2024-01-01T10:00:00Z');
            vi.setSystemTime(now);

            // Create a single job
            const job = await prisma.domainEnrichmentJob.create({
                data: {
                    domainId: testDomainId1,
                    status: DomainEnrichmentJobStatus.PENDING,
                    runAfter: now,
                    attempts: 0,
                },
            });

            // Act - Try to claim concurrently
            const claimPromises = Array(5)
                .fill(null)
                .map(() => claimNextDomainEnrichmentJob());

            const results = await Promise.all(claimPromises);

            // Assert - Only one Should get the job
            const successfulClaims = results.filter((result) => result !== null);
            expect(successfulClaims).toHaveLength(1);

            if (successfulClaims[0]) {
                expect(successfulClaims[0].id).toBe(job.id);
            }

            // Verify job is now RUNNING
            const updatedJob = await prisma.domainEnrichmentJob.findUnique({
                where: { id: job.id },
            });
            expect(updatedJob?.status).toBe(DomainEnrichmentJobStatus.RUNNING);
            expect(updatedJob?.attempts).toBe(1);

            vi.useRealTimers();
        });

        it('Should order by runAfter then createdAt', async () => {
            // Arrange
            vi.useFakeTimers();
            const now = new Date('2024-01-01T10:00:00Z');
            vi.setSystemTime(now);

            // Create jobs with same runAfter but different createdAt
            const job1 = await prisma.domainEnrichmentJob.create({
                data: {
                    domainId: testDomainId1,
                    status: DomainEnrichmentJobStatus.PENDING,
                    runAfter: now,
                    attempts: 0,
                    createdAt: new Date('2024-01-01T08:00:00Z'), // Earlier
                },
            });

            await prisma.domainEnrichmentJob.create({
                data: {
                    domainId: testDomainId2,
                    status: DomainEnrichmentJobStatus.PENDING,
                    runAfter: now,
                    attempts: 0,
                    createdAt: new Date('2024-01-01T09:00:00Z'), // Later
                },
            });

            // Act
            const claimed = await claimNextDomainEnrichmentJob();

            // Assert - Should claim job1 because it has earlier createdAt
            expect(claimed).not.toBeNull();
            expect(claimed?.id).toBe(job1.id);

            vi.useRealTimers();
        });

        it('Should increment attempts count', async () => {
            // Arrange
            vi.useFakeTimers();
            const now = new Date('2024-01-01T10:00:00Z');
            vi.setSystemTime(now);

            const job = await prisma.domainEnrichmentJob.create({
                data: {
                    domainId: testDomainId1,
                    status: DomainEnrichmentJobStatus.PENDING,
                    runAfter: now,
                    attempts: 3,
                },
            });

            // Act
            const claimed = await claimNextDomainEnrichmentJob();

            // Assert
            expect(claimed).not.toBeNull();
            expect(claimed?.attempts).toBe(4); // 3 + 1

            // Verify in database
            const updatedJob = await prisma.domainEnrichmentJob.findUnique({
                where: { id: job.id },
            });
            expect(updatedJob?.attempts).toBe(4);

            vi.useRealTimers();
        });

        it('Should clear lastError when claiming', async () => {
            // Arrange
            vi.useFakeTimers();
            const now = new Date('2024-01-01T10:00:00Z');
            vi.setSystemTime(now);

            const job = await prisma.domainEnrichmentJob.create({
                data: {
                    domainId: testDomainId1,
                    status: DomainEnrichmentJobStatus.PENDING,
                    runAfter: now,
                    attempts: 2,
                    lastError: 'Previous error message',
                },
            });

            // Act
            const claimed = await claimNextDomainEnrichmentJob();

            // Assert
            expect(claimed).not.toBeNull();

            // Verify lastError was cleared
            const updatedJob = await prisma.domainEnrichmentJob.findUnique({
                where: { id: job.id },
            });
            expect(updatedJob?.lastError).toBeNull();

            vi.useRealTimers();
        });

        it('Should handle race condition when job is claimed between findFirst and updateMany', async () => {
            // Arrange
            vi.useFakeTimers();
            const now = new Date('2024-01-01T10:00:00Z');
            vi.setSystemTime(now);

            // Create a job
            const job = await prisma.domainEnrichmentJob.create({
                data: {
                    domainId: testDomainId1,
                    status: DomainEnrichmentJobStatus.PENDING,
                    runAfter: now,
                    attempts: 0,
                },
            });

            // Simulate another process claiming the job
            await prisma.domainEnrichmentJob.update({
                where: { id: job.id },
                data: {
                    status: DomainEnrichmentJobStatus.RUNNING,
                    lockedUntil: new Date(now.getTime() + 2 * 60_000),
                },
            });

            // Act - Try to claim the already-claimed job
            const claimed = await claimNextDomainEnrichmentJob();

            // Assert - Should return null because job is no longer claimable
            expect(claimed).toBeNull();

            vi.useRealTimers();
        });

        it('Should claim job with STALE_GRACE_MS = 0 (immediate staleness)', async () => {
            // Arrange - STALE_GRACE_MS = 0 means any lockedUntil in the past is stale
            vi.useFakeTimers();
            const now = new Date('2024-01-01T10:00:00Z');
            vi.setSystemTime(now);

            // Create a RUNNING job with lock that expired 1 millisecond ago
            const job = await prisma.domainEnrichmentJob.create({
                data: {
                    domainId: testDomainId1,
                    status: DomainEnrichmentJobStatus.RUNNING,
                    runAfter: now,
                    lockedUntil: new Date(now.getTime() - 1), // 1ms ago
                    attempts: 1,
                },
            });

            // Act
            const claimed = await claimNextDomainEnrichmentJob();

            // Assert - Should claim the stale job
            expect(claimed).not.toBeNull();
            expect(claimed?.id).toBe(job.id);

            vi.useRealTimers();
        });

        it('Should return proper ClaimedDomainJob object structure', async () => {
            // Arrange
            vi.useFakeTimers();
            const now = new Date('2024-01-01T10:00:00Z');
            vi.setSystemTime(now);

            const job = await prisma.domainEnrichmentJob.create({
                data: {
                    domainId: testDomainId1,
                    status: DomainEnrichmentJobStatus.PENDING,
                    runAfter: now,
                    attempts: 0,
                },
            });

            // Act
            const claimed = await claimNextDomainEnrichmentJob();

            // Assert
            expect(claimed).toEqual({
                id: job.id,
                domainId: testDomainId1,
                hostname: 'claim-test-1.example.com',
                attempts: 1,
            });

            vi.useRealTimers();
        });
    });
});
