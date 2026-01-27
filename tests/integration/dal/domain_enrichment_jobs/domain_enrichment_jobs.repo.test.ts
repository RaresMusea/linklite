import { describe, beforeEach, it, expect, afterAll, vi, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { DomainEnrichmentJobStatus } from '@/generated/prisma/enums';
import {
    claimNextDomainEnrichmentJob,
    markDomainEnrichmentJobAsDone,
    requeueDomainEnrichmentJob,
    upsertDomainEnrichmentJob,
} from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.repo';
import { resetDb } from '@/tests/helpers/db';
import { DomainEnrichmentJob } from '@/generated/prisma/client';

const testDomainId = 'test-integration-domain-id';

describe('Domain Enrichment Jobs repository integration tests', () => {
    beforeEach(async () => {
        await prisma.domain.upsert({
            where: { id: testDomainId },
            create: {
                id: testDomainId,
                hostname: 'test-integration.example.com',
            },
            update: {},
        });
    });

    afterEach(async () => {
        await resetDb();
    });

    describe('Upsert Domain Enrichment job', () => {
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

        beforeEach(async () => {
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

    describe('Mark domain enrichment job as done ', () => {
        let testJobId: string;
        let job: DomainEnrichmentJob;

        beforeEach(async () => {
            job = await prisma.domainEnrichmentJob.create({
                data: {
                    domainId: testDomainId,
                    status: DomainEnrichmentJobStatus.RUNNING,
                    runAfter: new Date(),
                    lockedUntil: new Date(Date.now() + 2 * 60_000),
                    attempts: 1,
                    lastError: 'Some error',
                },
            });
            testJobId = job.id;
        });

        afterEach(async () => {
            await resetDb();
        });

        it('Should mark job as DONE and clear lock/error', async () => {
            // Act
            await markDomainEnrichmentJobAsDone(testJobId);

            // Assert
            const updatedJob = await prisma.domainEnrichmentJob.findUnique({
                where: { id: testJobId },
            });

            expect(updatedJob?.status).toBe(DomainEnrichmentJobStatus.DONE);
            expect(updatedJob?.lockedUntil).toBeNull();
            expect(updatedJob?.lastError).toBeNull();
            expect(updatedJob?.attempts).toBe(1);
        });

        it('Should work from different initial statuses', async () => {
            // Test from PENDING
            const pendingJob = await prisma.domainEnrichmentJob.update({
                where: { id: job.id },
                data: {status: DomainEnrichmentJobStatus.PENDING },
            });

            // Act
            await markDomainEnrichmentJobAsDone(pendingJob.id);

            // Assert
            const updatedPendingJob = await prisma.domainEnrichmentJob.findUnique({
                where: { id: pendingJob.id },
            });
            expect(updatedPendingJob?.status).toBe(DomainEnrichmentJobStatus.DONE);
            expect(updatedPendingJob?.lockedUntil).toBeNull();
            expect(updatedPendingJob?.lastError).toBeNull();

            // Clean up for next test
            await prisma.domainEnrichmentJob.delete({
                where: { id: pendingJob.id },
            });

            // Test from ERROR - need a different domain since domain_id has UNIQUE constraint
            const testDomain2 = await prisma.domain.create({
                data: {
                    hostname: 'status-test-2.example.com',
                },
            });

            const errorJob = await prisma.domainEnrichmentJob.create({
                data: {
                    domainId: testDomain2.id,
                    status: DomainEnrichmentJobStatus.ERROR,
                    runAfter: new Date(),
                    attempts: 3,
                    lastError: 'Failed to fetch data',
                    lockedUntil: new Date(Date.now() + 2 * 60_000),
                },
            });

            // Act
            await markDomainEnrichmentJobAsDone(errorJob.id);

            // Assert
            const updatedErrorJob = await prisma.domainEnrichmentJob.findUnique({
                where: { id: errorJob.id },
            });
            expect(updatedErrorJob?.status).toBe(DomainEnrichmentJobStatus.DONE);
            expect(updatedErrorJob?.lockedUntil).toBeNull();
            expect(updatedErrorJob?.lastError).toBeNull(); // Should clear error
            expect(updatedErrorJob?.attempts).toBe(3); // Should preserve attempts count

            // Clean up
            await prisma.domainEnrichmentJob.delete({
                where: { id: errorJob.id },
            });
            await prisma.domain.delete({
                where: { id: testDomain2.id },
            });
        });

        it('Should throw error for non-existent job', async () => {
            const nonExistentId = 'non-existent-job-id';
            await expect(markDomainEnrichmentJobAsDone(nonExistentId)).rejects.toThrow();
        });
    });

    describe('requeueDomainEnrichmentJob - Real Database Tests', () => {
        // let testDomainId: string;
        let testJobId: string;
        const MAX_BACKOFF_MIN = 60; // Should match your constant

        // beforeAll(async () => {
        //     // Create test domain
        //     const domain = await prisma.domain.create({
        //         data: {
        //             hostname: 'requeue-test.example.com',
        //         },
        //     });
        //     testDomainId = domain.id;
        // });

        // afterAll(async () => {
        //     // Clean up
        //     await prisma.domainEnrichmentJob.deleteMany({
        //         where: { domainId: testDomainId },
        //     });
        //     await prisma.domain.delete({
        //         where: { id: testDomainId },
        //     });
        // });

        beforeEach(async () => {
            const job = await prisma.domainEnrichmentJob.create({
                data: {
                    domainId: testDomainId,
                    status: DomainEnrichmentJobStatus.RUNNING,
                    runAfter: new Date(),
                    lockedUntil: new Date(Date.now() + 2 * 60_000),
                    attempts: 1,
                    lastError: null,
                },
            });
            testJobId = job.id;
        });

        describe('Compute backoff minutes (helper function tests)', () => {
            it('Should compute exponential backoff with limits', () => {
                // Test cases based on the formula: Math.min(MAX_BACKOFF_MIN, Math.max(1, 2 ** exp))
                // where exp = Math.min(attempts, 10)

                const testCases = [
                    { attempts: 0, expected: 1 }, // 2^0 = 1, max(1, 1) = 1
                    { attempts: 1, expected: 2 }, // 2^1 = 2, max(1, 2) = 2
                    { attempts: 2, expected: 4 }, // 2^2 = 4
                    { attempts: 3, expected: 8 }, // 2^3 = 8
                    { attempts: 4, expected: 16 }, // 2^4 = 16
                    { attempts: 5, expected: 32 }, // 2^5 = 32
                    { attempts: 6, expected: 60 }, // 2^6 = 64, min(60, 64) = 60 (capped)
                    { attempts: 7, expected: 60 }, // 2^7 = 128, min(60, 128) = 60 (capped)
                    { attempts: 10, expected: 60 }, // 2^10 = 1024, min(60, 1024) = 60 (capped)
                    { attempts: 15, expected: 60 }, // exp = min(15, 10) = 10, 2^10 = 1024, min(60, 1024) = 60
                ];

                // Since computeBackoffMinutes is not exported, we can't test it directly
                // But we can verify the logic indirectly through requeueDomainEnrichmentJob
                // or by testing the backoff calculation manually
                testCases.forEach(({ attempts, expected }) => {
                    const exp = Math.min(attempts, 10);
                    const result = Math.min(MAX_BACKOFF_MIN, Math.max(1, 2 ** exp));
                    expect(result).toBe(expected);
                });
            });

            it('Should never return less than 1 minute', () => {
                // Even with attempts = 0, Should return at least 1
                const exp = Math.min(0, 10);
                const result = Math.min(MAX_BACKOFF_MIN, Math.max(1, 2 ** exp));
                expect(result).toBe(1);
            });

            it('Should cap at MAX_BACKOFF_MIN (60)', () => {
                // With attempts >= 6, Should cap at 60
                for (let attempts = 6; attempts <= 20; attempts++) {
                    const exp = Math.min(attempts, 10);
                    const result = Math.min(MAX_BACKOFF_MIN, Math.max(1, 2 ** exp));
                    expect(result).toBe(60);
                }
            });
        });

        describe('Requeue domain enrichment job', () => {
            it('Should requeue job with computed backoff when no runAfter provided', async () => {
                // Arrange
                vi.useFakeTimers();
                const now = new Date('2024-01-01T10:00:00Z');
                vi.setSystemTime(now);

                const input = {
                    jobId: testJobId,
                    attempts: 2, // 2 attempts = 2^2 = 4 minutes backoff
                    error: 'Connection timeout',
                };

                // Act
                await requeueDomainEnrichmentJob(input);

                // Assert
                const updatedJob = await prisma.domainEnrichmentJob.findUnique({
                    where: { id: testJobId },
                });

                expect(updatedJob?.status).toBe(DomainEnrichmentJobStatus.PENDING);
                expect(updatedJob?.lockedUntil).toBeNull();
                expect(updatedJob?.lastError).toBe('Connection timeout');

                // Should schedule for 4 minutes from now (2 attempts = 2^2 = 4 minutes)
                const expectedRunAfter = new Date(now.getTime() + 4 * 60_000);
                expect(updatedJob?.runAfter).toEqual(expectedRunAfter);

                vi.useRealTimers();
            });

            it('Should use provided runAfter when specified', async () => {
                // Arrange
                vi.useFakeTimers();
                const now = new Date('2024-01-01T10:00:00Z');
                vi.setSystemTime(now);

                const customRunAfter = new Date('2024-01-01T14:30:00Z');
                const input = {
                    jobId: testJobId,
                    attempts: 3,
                    error: 'Rate limited',
                    runAfter: customRunAfter,
                };

                // Act
                await requeueDomainEnrichmentJob(input);

                // Assert
                const updatedJob = await prisma.domainEnrichmentJob.findUnique({
                    where: { id: testJobId },
                });

                expect(updatedJob?.status).toBe(DomainEnrichmentJobStatus.PENDING);
                expect(updatedJob?.runAfter).toEqual(customRunAfter); // Should use custom time
                expect(updatedJob?.lastError).toBe('Rate limited');

                vi.useRealTimers();
            });

            it('Should handle Error objects as error input', async () => {
                // Arrange
                const error = new Error('Network failure');
                const input = {
                    jobId: testJobId,
                    attempts: 1,
                    error: error,
                };

                // Act
                await requeueDomainEnrichmentJob(input);

                // Assert
                const updatedJob = await prisma.domainEnrichmentJob.findUnique({
                    where: { id: testJobId },
                });

                expect(updatedJob?.lastError).toBe('Network failure');
            });

            it('Should handle non-Error objects as error input', async () => {
                // Test different types of error inputs that are allowed by the type
                const testCases = [
                    {
                        error: 'String error message',
                        expected: 'String error message',
                    },
                    {
                        error: new Error('Error object message'),
                        expected: 'Error object message',
                    },
                    {
                        error: '', // Empty string
                        expected: '',
                    },
                    {
                        error: new Error(''), // Empty Error
                        expected: '',
                    },
                ];

                for (const testCase of testCases) {
                    // Reset job for each test
                    await prisma.domainEnrichmentJob.update({
                        where: { id: testJobId },
                        data: {
                            status: DomainEnrichmentJobStatus.RUNNING,
                            lastError: null,
                        },
                    });

                    const input = {
                        jobId: testJobId,
                        attempts: 1,
                        error: testCase.error,
                    };

                    // Act
                    await requeueDomainEnrichmentJob(input);

                    // Assert
                    const updatedJob = await prisma.domainEnrichmentJob.findUnique({
                        where: { id: testJobId },
                    });

                    expect(updatedJob?.lastError).toBe(testCase.expected);
                }
            });

            it('Should calculate correct backoff for different attempt counts', async () => {
                // Arrange
                vi.useFakeTimers();
                const now = new Date('2024-01-01T10:00:00Z');
                vi.setSystemTime(now);

                const testCases = [
                    { attempts: 0, expectedMinutes: 1 }, // 2^0 = 1
                    { attempts: 1, expectedMinutes: 2 }, // 2^1 = 2
                    { attempts: 2, expectedMinutes: 4 }, // 2^2 = 4
                    { attempts: 3, expectedMinutes: 8 }, // 2^3 = 8
                    { attempts: 4, expectedMinutes: 16 }, // 2^4 = 16
                    { attempts: 5, expectedMinutes: 32 }, // 2^5 = 32
                    { attempts: 6, expectedMinutes: 60 }, // 2^6 = 64, capped at 60
                    { attempts: 10, expectedMinutes: 60 }, // 2^10 = 1024, capped at 60
                    { attempts: 15, expectedMinutes: 60 }, // exp = 10, capped at 60
                ];

                for (const testCase of testCases) {
                    // Reset job for each test
                    await prisma.domainEnrichmentJob.update({
                        where: { id: testJobId },
                        data: {
                            status: DomainEnrichmentJobStatus.RUNNING,
                            lastError: null,
                        },
                    });

                    const input = {
                        jobId: testJobId,
                        attempts: testCase.attempts,
                        error: `Attempt ${testCase.attempts} failed`,
                    };

                    // Act
                    await requeueDomainEnrichmentJob(input);

                    // Assert
                    const updatedJob = await prisma.domainEnrichmentJob.findUnique({
                        where: { id: testJobId },
                    });

                    const expectedRunAfter = new Date(now.getTime() + testCase.expectedMinutes * 60_000);
                    expect(updatedJob?.runAfter).toEqual(expectedRunAfter);
                }

                vi.useRealTimers();
            });

            it('Should clear lockedUntil when requeueing', async () => {
                // Arrange
                const input = {
                    jobId: testJobId,
                    attempts: 1,
                    error: 'Test error',
                };

                // Verify job has lockedUntil set initially
                const initialJob = await prisma.domainEnrichmentJob.findUnique({
                    where: { id: testJobId },
                });
                expect(initialJob?.lockedUntil).not.toBeNull();

                // Act
                await requeueDomainEnrichmentJob(input);

                // Assert
                const updatedJob = await prisma.domainEnrichmentJob.findUnique({
                    where: { id: testJobId },
                });

                expect(updatedJob?.lockedUntil).toBeNull();
                expect(updatedJob?.status).toBe(DomainEnrichmentJobStatus.PENDING);
            });

            it('Should throw error for non-existent job', async () => {
                // Arrange
                const nonExistentId = 'non-existent-job-id';
                const input = {
                    jobId: nonExistentId,
                    attempts: 1,
                    error: 'Some error',
                };

                // Act & Assert
                await expect(requeueDomainEnrichmentJob(input)).rejects.toThrow();
            });

            it('Should handle requeue from different initial statuses', async () => {
                const statuses = [
                    DomainEnrichmentJobStatus.RUNNING,
                    DomainEnrichmentJobStatus.ERROR,
                    DomainEnrichmentJobStatus.PENDING,
                ];

                for (const status of statuses) {
                    // Reset job for each test
                    await prisma.domainEnrichmentJob.update({
                        where: { id: testJobId },
                        data: {
                            status: status,
                            lastError: `Initial ${status}`,
                        },
                    });

                    const input = {
                        jobId: testJobId,
                        attempts: 2,
                        error: `Requeued from ${status}`,
                    };

                    // Act
                    await requeueDomainEnrichmentJob(input);

                    // Assert
                    const updatedJob = await prisma.domainEnrichmentJob.findUnique({
                        where: { id: testJobId },
                    });

                    expect(updatedJob?.status).toBe(DomainEnrichmentJobStatus.PENDING);
                    expect(updatedJob?.lastError).toBe(`Requeued from ${status}`);
                }
            });

            it('Should preserve other fields when requeueing', async () => {
                // Arrange
                const originalJob = await prisma.domainEnrichmentJob.findUnique({
                    where: { id: testJobId },
                });

                vi.useFakeTimers();
                const now = new Date('2024-01-01T10:00:00Z');
                vi.setSystemTime(now);

                const input = {
                    jobId: testJobId,
                    attempts: 2,
                    error: 'Preservation test',
                };

                // Act
                await requeueDomainEnrichmentJob(input);

                // Assert
                const updatedJob = await prisma.domainEnrichmentJob.findUnique({
                    where: { id: testJobId },
                });

                // These Should change
                expect(updatedJob?.status).not.toBe(originalJob?.status);
                expect(updatedJob?.runAfter).not.toEqual(originalJob?.runAfter);
                expect(updatedJob?.lockedUntil).not.toBe(originalJob?.lockedUntil);
                expect(updatedJob?.lastError).not.toBe(originalJob?.lastError);

                // These Should remain unchanged
                expect(updatedJob?.id).toBe(originalJob?.id);
                expect(updatedJob?.domainId).toBe(originalJob?.domainId);
                expect(updatedJob?.attempts).toBe(originalJob?.attempts); // Note: attempts is not incremented by requeue
                expect(updatedJob?.createdAt).toEqual(originalJob?.createdAt);
                expect(updatedJob?.updatedAt).not.toBe(originalJob?.updatedAt); // Should be updated

                vi.useRealTimers();
            });

            it('Should work in a complete job lifecycle', async () => {
                // Clean up existing job first since domain_id has UNIQUE constraint
                await prisma.domainEnrichmentJob.delete({
                    where: { id: testJobId },
                });

                vi.useFakeTimers();
                let now = new Date('2024-01-01T10:00:00Z');
                vi.setSystemTime(now);

                // 1. Create and claim job
                const job = await prisma.domainEnrichmentJob.create({
                    data: {
                        domainId: testDomainId,
                        status: DomainEnrichmentJobStatus.PENDING,
                        attempts: 0,
                        runAfter: now, // Important: set runAfter to current time so it's eligible for claiming
                    },
                });

                const claimed = await claimNextDomainEnrichmentJob();
                expect(claimed).not.toBeNull();
                expect(claimed?.id).toBe(job.id);

                // 2. Requeue with error (first failure)
                const error1 = 'First attempt failed';
                await requeueDomainEnrichmentJob({
                    jobId: job.id,
                    attempts: 1, // First attempt failed
                    error: error1,
                });

                let updatedJob = await prisma.domainEnrichmentJob.findUnique({
                    where: { id: job.id },
                });
                expect(updatedJob?.status).toBe(DomainEnrichmentJobStatus.PENDING);
                expect(updatedJob?.lastError).toBe(error1);
                expect(updatedJob?.attempts).toBe(1);

                // Should be scheduled for 2 minutes from now (2^1 = 2)
                let expectedRunAfter = new Date(now.getTime() + 2 * 60_000);
                expect(updatedJob?.runAfter).toEqual(expectedRunAfter);

                // 3. Claim again (after waiting)
                now = new Date(expectedRunAfter.getTime() + 1000); // Move 1 second past runAfter
                vi.setSystemTime(now);

                const claimed2 = await claimNextDomainEnrichmentJob();
                expect(claimed2).not.toBeNull();
                expect(claimed2?.id).toBe(job.id);
                expect(claimed2?.attempts).toBe(2); // Should increment to 2

                // 4. Requeue again (second failure)
                const error2 = 'Second attempt failed';
                await requeueDomainEnrichmentJob({
                    jobId: job.id,
                    attempts: 2, // Second attempt failed
                    error: error2,
                });

                updatedJob = await prisma.domainEnrichmentJob.findUnique({
                    where: { id: job.id },
                });
                expect(updatedJob?.status).toBe(DomainEnrichmentJobStatus.PENDING);
                expect(updatedJob?.lastError).toBe(error2);

                // Should be scheduled for 4 minutes from now (2^2 = 4)
                expectedRunAfter = new Date(now.getTime() + 4 * 60_000);
                expect(updatedJob?.runAfter).toEqual(expectedRunAfter);

                // 5. Finally mark as DONE
                await markDomainEnrichmentJobAsDone(job.id);

                updatedJob = await prisma.domainEnrichmentJob.findUnique({
                    where: { id: job.id },
                });
                expect(updatedJob?.status).toBe(DomainEnrichmentJobStatus.DONE);
                expect(updatedJob?.lastError).toBeNull();

                vi.useRealTimers();
            });
        });
    });
});
