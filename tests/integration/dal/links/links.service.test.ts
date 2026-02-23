import { beforeEach, describe, expect, it } from 'vitest';
import { createAnonLinkWithQuota } from '@/dal/links/links.service';
import { prisma } from '@/lib/prisma';
import { resetDb } from '@/tests/helpers/db';
import { QuotaExceededError } from '@/lib/errors/QuotaExceededError';
import { DomainEnrichmentJobStatus, LinkEnrichmentJobStatus } from '@/generated/prisma/enums';

describe('Link with anonymous quota creation integration tests', () => {
    beforeEach(async () => {
        await resetDb();
    });

    it('Creates link, increments anon quota, and creates enrichment jobs', async () => {
        await prisma.anonActor.create({
            data: {
                anonId: 'anon-ok',
                createdCount: 0,
            },
        });

        const result = await createAnonLinkWithQuota(
            {
                slug: 'anon-created',
                targetUrl: 'https://example.com/path',
                ownerId: null,
            },
            'anon-ok',
            2
        );

        expect(result.slug).toBe('anon-created');

        const actor = await prisma.anonActor.findUnique({ where: { anonId: 'anon-ok' } });
        expect(actor?.createdCount).toBe(1);

        const link = await prisma.link.findUnique({ where: { id: result.id } });
        expect(link).not.toBeNull();

        const domainJob = await prisma.domainEnrichmentJob.findUnique({
            where: { domainId: result.domainId! },
        });
        expect(domainJob).not.toBeNull();
        expect(domainJob?.status).toBe(DomainEnrichmentJobStatus.PENDING);

        const linkJob = await prisma.linkEnrichmentJob.findUnique({
            where: { linkId: result.id },
        });
        expect(linkJob).not.toBeNull();
        expect(linkJob?.status).toBe(LinkEnrichmentJobStatus.PENDING);
    });

    it('Throws QuotaExceededError and persists nothing when actor reached limit', async () => {
        await prisma.anonActor.create({
            data: {
                anonId: 'anon-maxed',
                createdCount: 1,
            },
        });

        await expect(
            createAnonLinkWithQuota(
                {
                    slug: 'blocked-slug',
                    targetUrl: 'https://example.com/blocked',
                    ownerId: null,
                },
                'anon-maxed',
                1
            )
        ).rejects.toThrow(QuotaExceededError);

        const actor = await prisma.anonActor.findUnique({ where: { anonId: 'anon-maxed' } });
        expect(actor?.createdCount).toBe(1);
        expect(await prisma.link.count()).toBe(0);
        expect(await prisma.domain.count()).toBe(0);
        expect(await prisma.domainEnrichmentJob.count()).toBe(0);
        expect(await prisma.linkEnrichmentJob.count()).toBe(0);
    });

    it('Rolls back quota increment when link creation fails in transaction', async () => {
        await prisma.anonActor.create({
            data: {
                anonId: 'anon-rollback',
                createdCount: 0,
            },
        });

        const existingDomain = await prisma.domain.create({
            data: {
                hostname: 'example.com',
            },
        });

        await prisma.link.create({
            data: {
                slug: 'duplicate-slug',
                targetUrl: 'https://example.com/already',
                ownerId: null,
                domainId: existingDomain.id,
            },
        });

        const domainJobCountBefore = await prisma.domainEnrichmentJob.count();
        const linkJobCountBefore = await prisma.linkEnrichmentJob.count();

        await expect(
            createAnonLinkWithQuota(
                {
                    slug: 'duplicate-slug',
                    targetUrl: 'https://example.com/new',
                    ownerId: null,
                },
                'anon-rollback',
                2
            )
        ).rejects.toMatchObject({ code: 'P2002' });

        const actor = await prisma.anonActor.findUnique({ where: { anonId: 'anon-rollback' } });
        expect(actor?.createdCount).toBe(0);

        const links = await prisma.link.findMany({ where: { slug: 'duplicate-slug' } });
        expect(links).toHaveLength(1);

        expect(await prisma.domainEnrichmentJob.count()).toBe(domainJobCountBefore);
        expect(await prisma.linkEnrichmentJob.count()).toBe(linkJobCountBefore);
    });
});
