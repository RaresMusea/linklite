import { describe, beforeEach, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { DomainEnrichmentJobStatus } from '@/generated/prisma/enums';
import { upsertDomainEnrichmentJob } from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.repo';


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

});