import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResetPasswordInput } from '@/validation/ResetPasswordSchema';

const { infoMock, errorMock } = vi.hoisted(() => ({
    infoMock: vi.fn(),
    errorMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth/auth', () => ({
    auth: {
        api: {
            resetPassword: vi.fn(),
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
import { completeResetPassword } from '@/app/(auth)/reset-password/actions';

describe('Reset password server action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Returns field errors for invalid reset-password input', async () => {
        const result = await completeResetPassword({
            token: '',
            newPassword: 'weak',
            confirmPassword: 'different',
        } as ResetPasswordInput);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.fieldErrors?.token).toContain('Invalid reset token');
            expect(result.fieldErrors?.newPassword).toContain('Password must be at least 8 characters long');
            expect(result.fieldErrors?.confirmPassword).toContain('Passwords do not match');
        }
        expect(vi.mocked(auth.api.resetPassword)).not.toHaveBeenCalled();
    });

    it('Resets password and returns success message when auth reset succeeds', async () => {
        vi.mocked(auth.api.resetPassword).mockResolvedValueOnce({
            status: true,
        });

        const result = await completeResetPassword({
            token: 'reset-token-123',
            newPassword: 'Strong_Ab',
            confirmPassword: 'Strong_Ab',
        });

        expect(vi.mocked(auth.api.resetPassword)).toHaveBeenCalledWith({
            body: {
                token: 'reset-token-123',
                newPassword: 'Strong_Ab',
            },
        });
        expect(infoMock).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            success: true,
            message: 'Password updated successfully. You can sign in now.',
        });
    });

    it('Returns form error when auth reset throws', async () => {
        vi.mocked(auth.api.resetPassword).mockRejectedValueOnce(new Error('reset failed'));

        const result = await completeResetPassword({
            token: 'reset-token-123',
            newPassword: 'Strong_Ab',
            confirmPassword: 'Strong_Ab',
        });

        expect(result).toEqual({
            success: false,
            formError: 'Unable to reset password. This link may be invalid or expired.',
        });
        expect(errorMock).toHaveBeenCalledTimes(1);
    });

    it('Returns the same generic error when auth returns token-specific code', async () => {
        vi.mocked(auth.api.resetPassword).mockRejectedValueOnce({
            code: 'INVALID_TOKEN',
        });

        const result = await completeResetPassword({
            token: 'reset-token-123',
            newPassword: 'Strong_Ab',
            confirmPassword: 'Strong_Ab',
        });

        expect(result).toEqual({
            success: false,
            formError: 'Unable to reset password. This link may be invalid or expired.',
        });
    });
});
