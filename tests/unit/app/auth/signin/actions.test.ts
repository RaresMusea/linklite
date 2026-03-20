import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoginInput } from '@/validation/LoginSchema';

const { infoMock, errorMock } = vi.hoisted(() => ({
    infoMock: vi.fn(),
    errorMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth/auth', () => ({
    auth: {
        api: {
            signInEmail: vi.fn(),
        },
    },
}));

vi.mock('@/lib/logging/logger', () => ({
    logger: {
        component: () => ({
            child: () => ({
                info: infoMock,
                error: errorMock,
            }),
        }),
    },
}));

import { auth } from '@/lib/auth/auth';
import { signIn } from '@/app/(auth)/signin/actions';

describe('Sign in server action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Returns field errors for invalid sign-in input', async () => {
        const result = await signIn({
            email: 'invalid-email',
            password: 'weak',
        } as LoginInput);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.fieldErrors?.email).toContain('Invalid email address');
            expect(result.fieldErrors?.password).toContain('Password must be at least 8 characters long');
            expect(result.fieldErrors?.password).toContain('Password must contain at least one uppercase letter');
            expect(result.fieldErrors?.password).toContain('Password must contain at least one special character (!@#_)');
            expect(result.formError).toBeUndefined();
        }
        expect(vi.mocked(auth.api.signInEmail)).not.toHaveBeenCalled();
    });

    it('Signs in user and normalizes email when auth sign-in succeeds', async () => {
        vi.mocked(auth.api.signInEmail).mockResolvedValueOnce({
            redirect: false,
            token: 'session-token',
            user: {
                id: 'user_123',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                email: 'jane@example.com',
                emailVerified: true,
                name: 'Jane Doe',
                image: null,
            },
        });

        const result = await signIn({
            email: 'JANE@EXAMPLE.COM',
            password: 'Strong_Ab',
        });

        expect(vi.mocked(auth.api.signInEmail)).toHaveBeenCalledWith({
            body: {
                email: 'jane@example.com',
                password: 'Strong_Ab',
            },
        });
        expect(infoMock).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            success: true,
            message: 'Signed in successfully.',
        });
    });

    it('Returns form error when auth sign-in throws', async () => {
        vi.mocked(auth.api.signInEmail).mockImplementationOnce(async () => {
            throw new Error('sign in failed');
        });

        const result = await signIn({
            email: 'jane@example.com',
            password: 'Strong_Ab',
        });

        expect(result).toEqual({
            success: false,
            formError: 'Unable to sign in. Please check your credentials and try again.',
        });
        expect(errorMock).toHaveBeenCalledTimes(1);
    });

    it('Returns the same generic error when auth returns credential-specific code', async () => {
        vi.mocked(auth.api.signInEmail).mockRejectedValueOnce({
            code: 'INVALID_PASSWORD',
        });

        const result = await signIn({
            email: 'jane@example.com',
            password: 'Strong_Ab',
        });

        expect(result).toEqual({
            success: false,
            formError: 'Unable to sign in. Please check your credentials and try again.',
        });
    });
});
