import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/app/healthz/route';

describe('GET /api/app/healthz (unit)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-14T10:00:00.000Z'));

        vi.spyOn(process, 'uptime').mockReturnValue(123.456);

        process.env.APP_ENV = 'test';
        process.env.APP_VERSION = '1.2.3';
        process.env.APP_COMMIT = 'abc123';
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('returns 200 and expected payload', async () => {
        const res = await GET();

        expect(res.status).toBe(200);

        const body = await res.json();

        expect(body.ok).toBe(true);
        expect(body.env).toBe('test');
        expect(body.version).toBe('1.2.3');
        expect(body.commit).toBe('abc123');

        expect(body.uptime).toBe(123.456);
        expect(body.nodeVersion).toBe(process.version);
        expect(body.time).toBe('2026-01-14T10:00:00.000Z');

        // service format
        expect(body.service).toBe('linklite-test');
    });

    describe('GET /api/health (unit - error case)', () => {
        beforeEach(() => {
            vi.spyOn(process, 'uptime').mockImplementation(() => {
                throw new Error('boom');
            });

            // Spy pe console.error ca să nu polueze output-ul de test
            vi.spyOn(console, 'error').mockImplementation(() => {});
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('returns 500 and error payload when an exception is thrown', async () => {
            const res = await GET();

            expect(res.status).toBe(500);

            const body = await res.json();

            expect(body.ok).toBe(false);
            expect(body.error).toBe('Internal server error');
            expect(body.time).toBeDefined();

            expect(body.time).toMatch(/Z$/);

            expect(console.error).toHaveBeenCalledWith('[HEALTH_CHECK_ERROR]', expect.any(Error));
        });
    });
});
