import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/auth', () => ({
    auth: {
        api: {
            getSession: vi.fn(),
        },
    },
}));

import { auth } from '@/lib/auth/auth';
import { GET } from '@/app/api/app/auth-session/route';

describe('GET /api/app/auth-session (unit)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Forwards request headers to auth.api.getSession and returns payload', async () => {
        const payload = {
            session: {
                id: 'session-id',
                userId: 'user-id',
            },
            user: {
                id: 'user-id',
                email: 'test@test.com',
                name: 'Test User',
            },
        };

        vi.mocked(auth.api.getSession).mockResolvedValueOnce(payload as never);

        const request = new Request('http://localhost:3000/api/app/auth-session', {
            method: 'GET',
            headers: {
                cookie: 'better-auth.session_token=token123',
            },
        });

        const res = await GET(request);

        expect(auth.api.getSession).toHaveBeenCalledTimes(1);
        expect(auth.api.getSession).toHaveBeenCalledWith({
            headers: request.headers,
        });
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual(payload);
    });
});
