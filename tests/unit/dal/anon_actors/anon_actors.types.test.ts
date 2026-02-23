import { describe, expect, it } from 'vitest';
import { toAnonActorQuota } from '@/dal/anon_actors/anon_actors.types';
import { AnonActor } from '@/generated/prisma/client';

describe('AnonActor → AnonActorQuota mapping tests', () => {
    it('Returns only anonId and createdCount from an AnonActor', () => {
        const anonActor: AnonActor = {
            anonId: 'anon-123',
            createdCount: 7,
            firstSeenAt: new Date('2024-01-01T00:00:00.000Z'),
            lastSeenAt: new Date('2024-01-02T00:00:00.000Z'),
            lastIpAddrHash: 'hash-value',
        };

        expect(toAnonActorQuota(anonActor)).toEqual({
            anonId: 'anon-123',
            createdCount: 7,
        });
    });

    it('Preserves zero createdCount', () => {
        const anonActor: AnonActor = {
            anonId: 'anon-zero',
            createdCount: 0,
            firstSeenAt: new Date('2024-01-01T00:00:00.000Z'),
            lastSeenAt: new Date('2024-01-02T00:00:00.000Z'),
            lastIpAddrHash: null,
        };

        expect(toAnonActorQuota(anonActor)).toEqual({
            anonId: 'anon-zero',
            createdCount: 0,
        });
    });
});
