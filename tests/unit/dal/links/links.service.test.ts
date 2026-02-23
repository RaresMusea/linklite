import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainEnrichmentJobStatus } from '@/generated/prisma/enums';
import { QuotaExceededError } from '@/lib/errors/QuotaExceededError';

const mocks = vi.hoisted(() => ({
    mockTransaction: vi.fn(),
    mockIncrementAnonActorQuotaCountTx: vi.fn(),
    mockCreateLinkTx: vi.fn(),
    mockUpsertDomainEnrichmentJob: vi.fn(),
    mockUpsertLinkEnrichmentJob: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
    prisma: {
        $transaction: mocks.mockTransaction,
    },
}));

vi.mock('@/dal/anon_actors/anon_actors.repo', () => ({
    incrementAnonActorQuotaCountTx: mocks.mockIncrementAnonActorQuotaCountTx,
}));

vi.mock('@/dal/links/links.repo', () => ({
    createLinkTx: mocks.mockCreateLinkTx,
}));

vi.mock('@/dal/domain_enrichment_jobs/domain_enrichment_jobs.repo', () => ({
    upsertDomainEnrichmentJob: mocks.mockUpsertDomainEnrichmentJob,
}));

vi.mock('@/dal/link_enrichment_jobs/link_enrichment_jobs.repo', () => ({
    upsertLinkEnrichmentJob: mocks.mockUpsertLinkEnrichmentJob,
}));

import { createAnonLinkWithQuota } from '@/dal/links/links.service';

describe('Link with anonymous quota creation unit tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => fn({}));
    });

    it('Creates link in transaction, increments quota, and enqueues enrichment jobs', async () => {
        const created = {
            id: 'link-1',
            domainId: 'domain-1',
            slug: 'unit-slug',
            targetUrl: 'https://example.com',
            ownerId: null,
        };

        mocks.mockIncrementAnonActorQuotaCountTx.mockResolvedValue(true);
        mocks.mockCreateLinkTx.mockResolvedValue(created);

        const result = await createAnonLinkWithQuota(
            {
                slug: 'unit-slug',
                targetUrl: 'https://example.com',
                ownerId: null,
            },
            'anon-1',
            5
        );

        expect(result).toEqual(created);
        expect(mocks.mockIncrementAnonActorQuotaCountTx).toHaveBeenCalledTimes(1);
        expect(mocks.mockIncrementAnonActorQuotaCountTx).toHaveBeenCalledWith('anon-1', 5, expect.any(Object));
        expect(mocks.mockCreateLinkTx).toHaveBeenCalledTimes(1);
        expect(mocks.mockCreateLinkTx).toHaveBeenCalledWith(expect.any(Object), {
            slug: 'unit-slug',
            targetUrl: 'https://example.com',
            ownerId: null,
        });

        expect(mocks.mockUpsertDomainEnrichmentJob).toHaveBeenCalledTimes(1);
        expect(mocks.mockUpsertDomainEnrichmentJob).toHaveBeenCalledWith({
            domainId: 'domain-1',
            status: DomainEnrichmentJobStatus.PENDING,
        });
        expect(mocks.mockUpsertLinkEnrichmentJob).toHaveBeenCalledTimes(1);
        expect(mocks.mockUpsertLinkEnrichmentJob).toHaveBeenCalledWith('link-1');
    });

    it('Throws QuotaExceededError and does not create link when quota increment fails', async () => {
        mocks.mockIncrementAnonActorQuotaCountTx.mockResolvedValue(false);

        await expect(
            createAnonLinkWithQuota(
                {
                    slug: 'quota-fail',
                    targetUrl: 'https://example.com',
                    ownerId: null,
                },
                'anon-limit',
                1
            )
        ).rejects.toThrow(QuotaExceededError);

        expect(mocks.mockCreateLinkTx).not.toHaveBeenCalled();
        expect(mocks.mockUpsertDomainEnrichmentJob).not.toHaveBeenCalled();
        expect(mocks.mockUpsertLinkEnrichmentJob).not.toHaveBeenCalled();
    });

    it('Does not enqueue enrichment jobs if createLinkTx fails inside transaction', async () => {
        mocks.mockIncrementAnonActorQuotaCountTx.mockResolvedValue(true);
        mocks.mockCreateLinkTx.mockRejectedValue(Object.assign(new Error('duplicate'), { code: 'P2002' }));

        await expect(
            createAnonLinkWithQuota(
                {
                    slug: 'dup',
                    targetUrl: 'https://example.com',
                    ownerId: null,
                },
                'anon-2',
                3
            )
        ).rejects.toMatchObject({ code: 'P2002' });

        expect(mocks.mockUpsertDomainEnrichmentJob).not.toHaveBeenCalled();
        expect(mocks.mockUpsertLinkEnrichmentJob).not.toHaveBeenCalled();
    });
});
