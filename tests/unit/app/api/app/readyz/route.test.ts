import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/app/readyz/route';
import { ReadinessError } from '@/lib/errors/ReadinessError';

vi.mock('@/dal/migrations/migrations.service', () => ({
    checkReady: vi.fn(),
}));

import { checkReady } from '@/dal/migrations/migrations.service';

describe('GET /api/app/readyz (unit)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Should return 200 with readiness payload when checkReady succeeds', async () => {
        vi.mocked(checkReady).mockResolvedValueOnce({
            ok: true,
            migration: {
                migrationName: '002_add_table',
                startedAt: new Date('2024-02-01T00:00:00Z'),
                finishedAt: new Date('2024-02-01T00:00:00Z'),
                appliedStepsCount: 1,
            },
        });

        const res = await GET();

        expect(res.status).toBe(200);
        expect(res.headers.get('cache-control')).toBe('no-store, max-age=0');

        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.migration.migrationName).toBe('002_add_table');
        expect(body.migration.appliedStepsCount).toBe(1);
    });

    it('Should return readiness error payload when ReadinessError is thrown (migrations)', async () => {
        vi.mocked(checkReady).mockRejectedValueOnce(
            new ReadinessError('migrations', 'Database has 1 unfinished migrations')
        );

        const res = await GET();

        expect(res.status).toBe(503);
        expect(res.headers.get('cache-control')).toBe('no-store, max-age=0');

        const body = await res.json();
        expect(body).toEqual({ ok: false, reason: 'migrations' });
    });

    it('Should return readiness error payload when ReadinessError is thrown (database)', async () => {
        vi.mocked(checkReady).mockRejectedValueOnce(
            new ReadinessError('database', 'Database not reachable')
        );

        const res = await GET();

        expect(res.status).toBe(503);
        expect(res.headers.get('cache-control')).toBe('no-store, max-age=0');

        const body = await res.json();
        expect(body).toEqual({ ok: false, reason: 'database' });
    });

    it('Should return 503 with db reason when an unknown error is thrown', async () => {
        vi.mocked(checkReady).mockRejectedValueOnce(new Error('boom'));

        const res = await GET();

        expect(res.status).toBe(503);
        expect(res.headers.get('cache-control')).toBe('no-store, max-age=0');

        const body = await res.json();
        expect(body).toEqual({ ok: false, reason: 'db' });
    });
});
