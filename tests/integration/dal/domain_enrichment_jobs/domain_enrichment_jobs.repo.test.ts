import { describe, beforeEach, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { DomainEnrichmentJobStatus } from '@/generated/prisma/enums';
import {
    claimNextDomainEnrichmentJob,
    upsertDomainEnrichmentJob,
} from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.repo';


describe("Domain Enrichment Jobs repository integration tests", () => {

    describe('upsertDomainEnrichmentJob - Real Database Tests', () => {
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

        it('should create a new job when none exists', async () => {
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

        it('should update existing job with new status', async () => {
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
            // runAfter should be updated to current time
            expect(job?.runAfter).toBeInstanceOf(Date);
        });

        it('should maintain attempts count when updating status', async () => {
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
            // attempts and lastError should remain unchanged
            expect(job?.attempts).toBe(3);
            expect(job?.lastError).toBe('Previous error');
        });

        it('should handle concurrent upserts', async () => {
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

    describe('claimNextDomainEnrichmentJob - Integration Tests', () => {
        beforeEach(async () => {
            // Clean up test data in correct order
            await prisma.domainEnrichmentJob.deleteMany();
            await prisma.domain.deleteMany();

            vi.useFakeTimers();
        });

        afterEach(async () => {
            await prisma.domainEnrichmentJob.deleteMany();
            await prisma.domain.deleteMany();

            vi.useRealTimers();
        });

        describe('Successful job claiming', () => {
            it('should claim the oldest pending job with runAfter in the past', async () => {
                // Arrange
                const now = new Date('2024-01-15T10:00:00Z');
                vi.setSystemTime(now);

                // Create a domain first
                const domain = await prisma.domain.create({
                    data: {
                        hostname: 'example.com',
                        firstSeenAt: new Date(),
                    },
                });

                const domain2 = await prisma.domain.create({
                    data: {
                        hostname: 'example.net',
                        firstSeenAt: new Date(),
                    }
                })

                // Create pending jobs with different runAfter times
                const job1 = await prisma.domainEnrichmentJob.create({
                    data: {
                        domainId: domain.id,
                        status: DomainEnrichmentJobStatus.PENDING,
                        runAfter: new Date('2024-01-15T09:00:00Z'), // 1 hour ago
                        createdAt: new Date('2024-01-15T08:00:00Z'), // Oldest
                    },
                });

                const job2 = await prisma.domainEnrichmentJob.create({
                    data: {
                        domainId: domain2.id,
                        status: DomainEnrichmentJobStatus.PENDING,
                        runAfter: new Date('2024-01-15T09:30:00Z'), // 30 minutes ago
                        createdAt: new Date('2024-01-15T08:30:00Z'), // Newer
                    },
                });

                // Act
                const claimedJob = await claimNextDomainEnrichmentJob();

                // Assert
                expect(claimedJob).not.toBeNull();
                expect(claimedJob?.id).toBe(job1.id); // Should claim the oldest job
                expect(claimedJob?.domainId).toBe(domain.id);
                expect(claimedJob?.domain.hostname).toBe('example.com');
                expect(claimedJob?.attempts).toBe(1); // Attempts incremented

                // Verify job status was updated to RUNNING
                const updatedJob = await prisma.domainEnrichmentJob.findUnique({
                    where: { id: job1.id },
                });

                expect(updatedJob?.status).toBe(DomainEnrichmentJobStatus.RUNNING);
                expect(updatedJob?.attempts).toBe(1);
                expect(updatedJob?.lastError).toBeNull();

                // Second job should still be PENDING
                const secondJob = await prisma.domainEnrichmentJob.findUnique({
                    where: { id: job2.id },
                });
                expect(secondJob?.status).toBe(DomainEnrichmentJobStatus.PENDING);
            });

            it('should increment attempts counter when claiming job', async () => {
                // Arrange
                const now = new Date('2024-01-15T10:00:00Z');
                vi.setSystemTime(now);

                const domain = await prisma.domain.create({
                    data: {
                        hostname: 'test.com',
                        firstSeenAt: new Date(),
                    },
                });

                // Create job with initial attempts
                const job = await prisma.domainEnrichmentJob.create({
                    data: {
                        domainId: domain.id,
                        status: DomainEnrichmentJobStatus.PENDING,
                        runAfter: new Date('2024-01-15T09:00:00Z'),
                        attempts: 2,
                        lastError: 'Previous error',
                    },
                });

                // Act
                const claimedJob = await claimNextDomainEnrichmentJob();

                // Assert
                expect(claimedJob?.id).toBe(job.id);
                expect(claimedJob?.attempts).toBe(3); // Incremented from 2 to 3
                expect(claimedJob?.domain.hostname).toBe('test.com');

                // Verify database state
                const updatedJob = await prisma.domainEnrichmentJob.findUnique({
                    where: { id: job.id },
                });

                expect(updatedJob?.attempts).toBe(3);
                expect(updatedJob?.lastError).toBeNull(); // Should clear previous error
            });

            it('should claim job with exact runAfter time', async () => {
                // Arrange
                const now = new Date('2024-01-15T10:00:00Z');
                vi.setSystemTime(now);

                const domain = await prisma.domain.create({
                    data: {
                        hostname: 'exact-time.com',
                        firstSeenAt: new Date(),
                    },
                });

                await prisma.domainEnrichmentJob.create({
                    data: {
                        domainId: domain.id,
                        status: DomainEnrichmentJobStatus.PENDING,
                        runAfter: now, // Exact same time as now
                    },
                });

                // Act
                const claimedJob = await claimNextDomainEnrichmentJob();

                // Assert
                expect(claimedJob).not.toBeNull();
                expect(claimedJob?.domain.hostname).toBe('exact-time.com');
            });

            it('should include domain hostname in returned job', async () => {
                // Arrange
                const now = new Date('2024-01-15T10:00:00Z');
                vi.setSystemTime(now);

                const domain = await prisma.domain.create({
                    data: {
                        hostname: 'included-hostname.com',
                        firstSeenAt: new Date(),
                    },
                });

                await prisma.domainEnrichmentJob.create({
                    data: {
                        domainId: domain.id,
                        status: DomainEnrichmentJobStatus.PENDING,
                        runAfter: new Date('2024-01-15T09:00:00Z'),
                    },
                });

                // Act
                const claimedJob = await claimNextDomainEnrichmentJob();

                // Assert
                expect(claimedJob?.domain.hostname).toBe('included-hostname.com');
                expect(claimedJob?.domainId).toBe(domain.id);
            });
        });

        describe('No jobs to claim', () => {
            it('should return null when no pending jobs exist', async () => {
                // Arrange - No jobs created
                // Act
                const result = await claimNextDomainEnrichmentJob();

                // Assert
                expect(result).toBeNull();
            });

            it('should return null when all jobs have future runAfter dates', async () => {
                // Arrange
                const now = new Date('2024-01-15T10:00:00Z');
                vi.setSystemTime(now);

                const domain = await prisma.domain.create({
                    data: {
                        hostname: 'future.com',
                        firstSeenAt: new Date(),
                    },
                });

                await prisma.domainEnrichmentJob.create({
                    data: {
                        domainId: domain.id,
                        status: DomainEnrichmentJobStatus.PENDING,
                        runAfter: new Date('2024-01-15T11:00:00Z'), // 1 hour in future
                    },
                });

                // Act
                const result = await claimNextDomainEnrichmentJob();

                // Assert
                expect(result).toBeNull();
            });

            it('should return null when only non-PENDING jobs exist', async () => {
                // Arrange
                const now = new Date('2024-01-15T10:00:00Z');
                vi.setSystemTime(now);

                // Create different domains for each job since domainId is unique
                const domains = [
                    { hostname: 'running-domain.com' },
                    { hostname: 'done-domain.com' },
                    { hostname: 'error-domain.com' },
                ];

                const statuses = [
                    DomainEnrichmentJobStatus.RUNNING,
                    DomainEnrichmentJobStatus.DONE,
                    DomainEnrichmentJobStatus.ERROR,
                ];

                for (let i = 0; i < statuses.length; i++) {
                    const domain = await prisma.domain.create({
                        data: {
                            hostname: domains[i].hostname,
                            firstSeenAt: new Date(),
                        },
                    });

                    await prisma.domainEnrichmentJob.create({
                        data: {
                            domainId: domain.id,
                            status: statuses[i],
                            runAfter: new Date('2024-01-15T09:00:00Z'), // In the past
                        },
                    });
                }

                // Act
                const result = await claimNextDomainEnrichmentJob();

                // Assert
                expect(result).toBeNull();
            });

            it('should return null when job is already claimed by another process', async () => {
                // Arrange
                const now = new Date('2024-01-15T10:00:00Z');
                vi.setSystemTime(now);

                const domain = await prisma.domain.create({
                    data: {
                        hostname: 'race-condition.com',
                        firstSeenAt: new Date(),
                    },
                });

                const job = await prisma.domainEnrichmentJob.create({
                    data: {
                        domainId: domain.id,
                        status: DomainEnrichmentJobStatus.PENDING,
                        runAfter: new Date('2024-01-15T09:00:00Z'),
                    },
                });

                // Simulate another process claiming the job first
                await prisma.domainEnrichmentJob.update({
                    where: { id: job.id },
                    data: { status: DomainEnrichmentJobStatus.RUNNING },
                });

                // Act
                const result = await claimNextDomainEnrichmentJob();

                // Assert
                expect(result).toBeNull();
            });
        });

        describe('Concurrent job claiming', () => {
            it('should handle concurrent claims gracefully', async () => {
                // Arrange
                const now = new Date('2024-01-15T10:00:00Z');
                vi.setSystemTime(now);

                const domain = await prisma.domain.create({
                    data: {
                        hostname: 'concurrent.com',
                        firstSeenAt: new Date(),
                    },
                });

                // Create a single job
                const job = await prisma.domainEnrichmentJob.create({
                    data: {
                        domainId: domain.id,
                        status: DomainEnrichmentJobStatus.PENDING,
                        runAfter: new Date('2024-01-15T09:00:00Z'),
                    },
                });

                // Act - Simulate concurrent claims
                const promises = Array.from({ length: 5 }, () => claimNextDomainEnrichmentJob());

                const results = await Promise.all(promises);

                // Assert - Only one claim should succeed
                const successfulClaims = results.filter((r) => r !== null);
                expect(successfulClaims).toHaveLength(1);

                const failedClaims = results.filter((r) => r === null);
                expect(failedClaims).toHaveLength(4);

                // Verify job is now RUNNING
                const updatedJob = await prisma.domainEnrichmentJob.findUnique({
                    where: { id: job.id },
                });
                expect(updatedJob?.status).toBe(DomainEnrichmentJobStatus.RUNNING);
                expect(updatedJob?.attempts).toBe(1);
            });

            it('should only claim PENDING jobs that are still PENDING during update', async () => {
                // This tests the atomicity of the update operation
                // Arrange
                const now = new Date('2024-01-15T10:00:00Z');
                vi.setSystemTime(now);

                const domain = await prisma.domain.create({
                    data: {
                        hostname: 'atomic-test.com',
                        firstSeenAt: new Date(),
                    },
                });

                const domain2 = await prisma.domain.create({
                    data: {
                        hostname: 'atomic-test-2.com',
                        firstSeenAt: new Date(),
                    },
                });

                const job1 = await prisma.domainEnrichmentJob.create({
                    data: {
                        domainId: domain.id,
                        status: DomainEnrichmentJobStatus.PENDING,
                        runAfter: new Date('2024-01-15T09:00:00Z'),
                        createdAt: new Date('2024-01-15T08:00:00Z'),
                    },
                });

                const job2 = await prisma.domainEnrichmentJob.create({
                    data: {
                        domainId: domain2.id,
                        status: DomainEnrichmentJobStatus.PENDING,
                        runAfter: new Date('2024-01-15T09:30:00Z'),
                        createdAt: new Date('2024-01-15T08:30:00Z'),
                    },
                });

                // Manually change job1 status to simulate another process
                await prisma.domainEnrichmentJob.update({
                    where: { id: job1.id },
                    data: { status: DomainEnrichmentJobStatus.RUNNING },
                });

                // Act
                const claimedJob = await claimNextDomainEnrichmentJob();

                // Assert - Should claim job2 since job1 is no longer PENDING
                expect(claimedJob?.id).toBe(job2.id);
            });
        });

        describe('Job ordering', () => {
            it('should claim jobs in chronological order by createdAt', async () => {
                // Arrange
                const now = new Date('2024-01-15T10:00:00Z');
                vi.setSystemTime(now);

                // Create domains for each job
                const jobs = [
                    {
                        createdAt: '2024-01-15T07:00:00Z',
                        hostname: 'oldest-job.com',
                        id: '',
                    },
                    {
                        createdAt: '2024-01-15T08:00:00Z',
                        hostname: 'middle-job.com',
                        id: '',
                    },
                    {
                        createdAt: '2024-01-15T09:00:00Z',
                        hostname: 'newest-job.com',
                        id: '',
                    },
                ];

                for (const job of jobs) {
                    const domain = await prisma.domain.create({
                        data: {
                            hostname: job.hostname,
                            firstSeenAt: new Date(),
                        },
                    });

                    const createdJob = await prisma.domainEnrichmentJob.create({
                        data: {
                            domainId: domain.id,
                            status: DomainEnrichmentJobStatus.PENDING,
                            runAfter: new Date('2024-01-15T09:00:00Z'),
                            createdAt: new Date(job.createdAt),
                        },
                    });
                    job.id = createdJob.id;
                }

                // Act & Assert - Claim first job (oldest)
                const firstClaim = await claimNextDomainEnrichmentJob();
                expect(firstClaim?.id).toBe(jobs[0].id);

                // Update first job to DONE (not DONE - check your enum)
                await prisma.domainEnrichmentJob.update({
                    where: { id: jobs[0].id },
                    data: { status: DomainEnrichmentJobStatus.DONE },
                });

                // Claim second job (middle)
                const secondClaim = await claimNextDomainEnrichmentJob();
                expect(secondClaim?.id).toBe(jobs[1].id);

                // Update second job to DONE
                await prisma.domainEnrichmentJob.update({
                    where: { id: jobs[1].id },
                    data: { status: DomainEnrichmentJobStatus.DONE },
                });

                // Claim third job (newest)
                const thirdClaim = await claimNextDomainEnrichmentJob();
                expect(thirdClaim?.id).toBe(jobs[2].id);
            });

            it('should prioritize older jobs even with later runAfter times', async () => {
                // Arrange
                const now = new Date('2024-01-15T10:00:00Z');
                vi.setSystemTime(now);

                const domain = await prisma.domain.create({
                    data: {
                        hostname: 'priority.com',
                        firstSeenAt: new Date(),
                    },
                });

                const secondDomain = await prisma.domain.create({
                    data: {
                        hostname: 'priority-level-2.com',
                        firstSeenAt: new Date(),
                    },
                });



                // Older job with later runAfter
                const olderJob = await prisma.domainEnrichmentJob.create({
                    data: {
                        domainId: domain.id,
                        status: DomainEnrichmentJobStatus.PENDING,
                        runAfter: new Date('2024-01-15T10:30:00Z'), // In future
                        createdAt: new Date('2024-01-15T08:00:00Z'), // Older
                    },
                });

                // Newer job with earlier runAfter (eligible now)
                const newerJob = await prisma.domainEnrichmentJob.create({
                    data: {
                        domainId: secondDomain.id,
                        status: DomainEnrichmentJobStatus.PENDING,
                        runAfter: new Date('2024-01-15T09:00:00Z'), // In past
                        createdAt: new Date('2024-01-15T09:00:00Z'), // Newer
                    },
                });

                // Act
                const claimedJob = await claimNextDomainEnrichmentJob();

                // Assert - Should claim newer job because older job's runAfter is in future
                expect(claimedJob?.id).toBe(newerJob.id);

                // Move time forward to make older job eligible
                vi.setSystemTime(new Date('2024-01-15T10:45:00Z'));

                // Complete the first job
                await prisma.domainEnrichmentJob.update({
                    where: { id: newerJob.id },
                    data: { status: DomainEnrichmentJobStatus.DONE },
                });

                // Act - Claim next job
                const secondClaim = await claimNextDomainEnrichmentJob();

                // Assert - Now should claim the older job
                expect(secondClaim?.id).toBe(olderJob.id);
            });
        });

        describe('Error scenarios', () => {
            it('should clear lastError when claiming a previously failed job', async () => {
                // Arrange
                const now = new Date('2024-01-15T10:00:00Z');
                vi.setSystemTime(now);

                const domain = await prisma.domain.create({
                    data: {
                        hostname: 'retry.com',
                        firstSeenAt: new Date(),
                    },
                });

                const job = await prisma.domainEnrichmentJob.create({
                    data: {
                        domainId: domain.id,
                        status: DomainEnrichmentJobStatus.PENDING,
                        runAfter: new Date('2024-01-15T09:00:00Z'),
                        attempts: 1,
                        lastError: 'Previous failure: Connection timeout',
                    },
                });

                // Act
                const claimedJob = await claimNextDomainEnrichmentJob();

                // Assert
                expect(claimedJob).not.toBeNull();

                // Verify error was cleared in database
                const updatedJob = await prisma.domainEnrichmentJob.findUnique({
                    where: { id: job.id },
                });

                expect(updatedJob?.lastError).toBeNull();
            });
        });
    });

});