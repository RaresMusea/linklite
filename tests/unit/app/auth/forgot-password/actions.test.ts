import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ForgotPasswordInput } from '@/validation/ForgotPasswordSchema';

const { infoMock, errorMock } = vi.hoisted(() => ({
    infoMock: vi.fn(),
    errorMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth/auth', () => ({
    auth: {
        api: {
            requestPasswordReset: vi.fn(),
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
import { requestPasswordReset } from '@/app/(auth)/forgot-password/actions';

const ORIGINAL_BETTER_AUTH_URL = process.env.BETTER_AUTH_URL;
const ORIGINAL_NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL;

describe('Forgot password server action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        process.env.BETTER_AUTH_URL = ORIGINAL_BETTER_AUTH_URL;
        process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_NEXT_PUBLIC_APP_URL;
    });

    it('Returns field errors for invalid forgot-password input', async () => {
        const result = await requestPasswordReset({
            email: 'invalid-email',
        } as ForgotPasswordInput);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.fieldErrors?.email).toContain('Invalid email address');
        }
        expect(vi.mocked(auth.api.requestPasswordReset)).not.toHaveBeenCalled();
    });

    it('Requests password reset, normalizes email, and prefers BETTER_AUTH_URL for redirect base', async () => {
        process.env.BETTER_AUTH_URL = 'https://auth.linklite.dev/';
        process.env.NEXT_PUBLIC_APP_URL = 'https://app.linklite.dev';

        vi.mocked(auth.api.requestPasswordReset).mockResolvedValueOnce({
            status: true,
            message: 'Password reset email sent',
        });

        const result = await requestPasswordReset({
            email: 'JANE@EXAMPLE.COM',
        });

        expect(vi.mocked(auth.api.requestPasswordReset)).toHaveBeenCalledWith({
            body: {
                email: 'jane@example.com',
                redirectTo: 'https://auth.linklite.dev/reset-password',
            },
        });
        expect(infoMock).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            success: true,
            message: 'Password reset email sent',
        });
    });

    it('Falls back to NEXT_PUBLIC_APP_URL when BETTER_AUTH_URL is not set', async () => {
        delete process.env.BETTER_AUTH_URL;
        process.env.NEXT_PUBLIC_APP_URL = 'https://app.linklite.dev/';

        vi.mocked(auth.api.requestPasswordReset).mockResolvedValueOnce({
            status: true,
            message: 'Password reset email sent',
        });

        await requestPasswordReset({
            email: 'jane@example.com',
        });

        expect(vi.mocked(auth.api.requestPasswordReset)).toHaveBeenCalledWith({
            body: {
                email: 'jane@example.com',
                redirectTo: 'https://app.linklite.dev/reset-password',
            },
        });
    });

    it('Returns form error when password reset request throws', async () => {
        vi.mocked(auth.api.requestPasswordReset).mockRejectedValueOnce(new Error('request failed'));

        const result = await requestPasswordReset({
            email: 'jane@example.com',
        });

        expect(result).toEqual({
            success: false,
            formError: 'Unable to request a password reset right now. Please try again.',
        });
        expect(errorMock).toHaveBeenCalledTimes(1);
    });
});
