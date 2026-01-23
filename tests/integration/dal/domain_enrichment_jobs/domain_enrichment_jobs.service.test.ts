import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { DomainSource, DomainStatus } from '@/generated/prisma/client';
import { RdapStatus } from '@/lib/rdap/rdap.types';

vi.mock('@/dal/domains/domains.service', async () => {
    const actual = await vi.importActual<typeof import('@/dal/domains/domains.service')>(
        '@/dal/domains/domains.service'
    );

    return {
        ...actual,
        getRdapInfo: vi.fn(),
        getWhoisInfo: vi.fn(),
    };
});

import { getRdapInfo, getWhoisInfo } from '@/dal/domains/domains.service';
import { resetDb } from '@/tests/helpers/db';
import { processDomainEnrichment } from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.service';
import { WhoisStatus } from '@/lib/whois/whois.types';

describe('processDomainEnrichment (integration)', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        await resetDb();
    });

    it('persists RDAP cache + best-known and does not call WHOIS when RDAP is OK with registeredAt', async () => {
        // Arrange: domain in DB
        const domain = await prisma.domain.create({
            data: { hostname: 'example.com' },
            select: { id: true },
        });

        const registeredAt = new Date('2020-01-01T00:00:00Z');
        const checkedAt = new Date('2026-01-01T00:00:00Z');
        const rdapFetchedAt = new Date('2026-01-01T00:00:00Z');

        (getRdapInfo as Mock).mockResolvedValue({
            registeredAt,
            status: RdapStatus.OK,
            source: 'RDAP',
            checkedAt,
            rdapFetchedAt,
            rdapRaw: { foo: 'bar' },
        });

        // Act
        await processDomainEnrichment('example.com', domain.id);

        // Assert: WHOIS not called
        expect(getWhoisInfo).not.toHaveBeenCalled();

        // Assert: DB updated
        const updated = await prisma.domain.findUniqueOrThrow({
            where: { id: domain.id },
            select: {
                registeredAt: true,
                checkedAt: true,
                source: true,
                status: true,
                rdapFetchedAt: true,
                rdapRaw: true,
                whoisFetchedAt: true,
                whoisRaw: true,
            },
        });

        expect(updated.registeredAt?.toISOString()).toBe(registeredAt.toISOString());
        expect(updated.checkedAt?.toISOString()).toBe(checkedAt.toISOString());
        expect(updated.source).toBe(DomainSource.RDAP);
        expect(updated.status).toBe(DomainStatus.OK);

        expect(updated.rdapFetchedAt?.toISOString()).toBe(rdapFetchedAt.toISOString());
        expect(updated.rdapRaw).toEqual({ foo: 'bar' });

        expect(updated.whoisFetchedAt).toBeNull();
        expect(updated.whoisRaw).toBeNull();
    });

    it('falls back to WHOIS when RDAP is MISSING and persists whois cache + best-known', async () => {
        const domain = await prisma.domain.create({
            data: { hostname: 'example.com' },
            select: { id: true },
        });

        const checkedAtRdap = new Date('2026-01-01T00:00:00Z');
        const checkedAtWhois = new Date('2026-01-02T00:00:00Z');
        const registeredAtWhois = new Date('2019-05-05T00:00:00Z');

        (getRdapInfo as Mock).mockResolvedValue({
            registeredAt: null,
            status: RdapStatus.MISSING,
            source: 'RDAP',
            checkedAt: checkedAtRdap,
            rdapFetchedAt: checkedAtRdap,
            rdapRaw: { note: 'missing' },
        });

        (getWhoisInfo as Mock).mockResolvedValue({
            registeredAt: registeredAtWhois,
            status: WhoisStatus.OK,
            source: 'WHOIS',
            checkedAt: checkedAtWhois,
            whoisFetchedAt: checkedAtWhois,
            whoisRaw: 'Creation Date: 2019-05-05T00:00:00Z',
        });

        await processDomainEnrichment('example.com', domain.id);

        expect(getWhoisInfo).toHaveBeenCalledTimes(1);

        const updated = await prisma.domain.findUniqueOrThrow({
            where: { id: domain.id },
            select: {
                registeredAt: true,
                checkedAt: true,
                source: true,
                status: true,
                rdapRaw: true,
                whoisRaw: true,
            },
        });

        // best-known should come from WHOIS (has registeredAt)
        expect(updated.source).toBe(DomainSource.WHOIS);
        expect(updated.status).toBe(DomainStatus.OK);
        expect(updated.registeredAt?.toISOString()).toBe(registeredAtWhois.toISOString());
        expect(updated.checkedAt?.toISOString()).toBe(checkedAtWhois.toISOString());

        // caches persisted
        expect(updated.rdapRaw).toEqual({ note: 'missing' });
        expect(updated.whoisRaw).toContain('Creation Date');
    });
});