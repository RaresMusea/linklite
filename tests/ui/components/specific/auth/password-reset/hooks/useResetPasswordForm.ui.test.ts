import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResetPasswordInput } from '@/validation/ResetPasswordSchema';

const mocks = vi.hoisted(() => ({
    completeResetPassword: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    replace: vi.fn(),
}));

vi.mock('@/app/(auth)/reset-password/actions', () => ({
    completeResetPassword: mocks.completeResetPassword,
}));

vi.mock('sonner', () => ({
    toast: {
        success: mocks.toastSuccess,
        error: mocks.toastError,
    },
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        replace: mocks.replace,
    }),
}));

import { useResetPasswordForm } from '@/components/specific/auth/password-reset/hooks/useResetPasswordForm';

const token = 'reset-token-123';

const validPayload: ResetPasswordInput = {
    token,
    newPassword: 'Strong_Ab',
    confirmPassword: 'Strong_Ab',
};

describe('useResetPasswordForm hook tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Exposes default form state', () => {
        const { result } = renderHook(() => useResetPasswordForm(token));

        expect(result.current.isSubmitting).toBe(false);
        expect(result.current.errors.token).toBeUndefined();
        expect(result.current.errors.newPassword).toBeUndefined();
        expect(result.current.errors.confirmPassword).toBeUndefined();
    });

    it('Shows success toast and redirects to signin when reset succeeds', async () => {
        mocks.completeResetPassword.mockResolvedValueOnce({
            success: true,
            message: 'Password updated successfully. You can sign in now.',
        });

        const { result } = renderHook(() => useResetPasswordForm(token));

        await act(async () => {
            await result.current.onSubmit(validPayload);
        });

        expect(mocks.completeResetPassword).toHaveBeenCalledWith(validPayload);
        expect(mocks.toastSuccess).toHaveBeenCalledWith(
            'Password updated successfully. You can sign in now.',
            expect.objectContaining({
                duration: 4000,
                closeButton: true,
                dismissible: true,
                className: expect.stringContaining('register-success-toast'),
            })
        );
        expect(mocks.replace).toHaveBeenCalledWith('/signin');
    });

    it('Shows form error toast when backend returns formError', async () => {
        mocks.completeResetPassword.mockResolvedValueOnce({
            success: false,
            formError: 'Unable to reset password. This link may be invalid or expired.',
        });

        const { result } = renderHook(() => useResetPasswordForm(token));

        await act(async () => {
            await result.current.onSubmit(validPayload);
        });

        expect(mocks.toastError).toHaveBeenCalledWith(
            'Unable to reset password. This link may be invalid or expired.',
            expect.objectContaining({
                duration: 4000,
                closeButton: true,
                dismissible: true,
            })
        );
        expect(mocks.replace).not.toHaveBeenCalled();
    });

    it('Maps field errors to react-hook-form state and skips fallback toast', async () => {
        mocks.completeResetPassword.mockResolvedValueOnce({
            success: false,
            fieldErrors: {
                newPassword: ['Password must be at least 8 characters long'],
            },
        });

        const { result } = renderHook(() => useResetPasswordForm(token));

        await act(async () => {
            await result.current.onSubmit(validPayload);
        });

        expect(result.current.errors.newPassword?.message).toBe('Password must be at least 8 characters long');
        expect(mocks.toastError).not.toHaveBeenCalled();
        expect(mocks.replace).not.toHaveBeenCalled();
    });

    it('Shows fallback error toast when response has no formError and no field errors', async () => {
        mocks.completeResetPassword.mockResolvedValueOnce({
            success: false,
        });

        const { result } = renderHook(() => useResetPasswordForm(token));

        await act(async () => {
            await result.current.onSubmit(validPayload);
        });

        expect(mocks.toastError).toHaveBeenCalledWith(
            'Unable to reset password. Please try again.',
            expect.objectContaining({
                duration: 4000,
                closeButton: true,
                dismissible: true,
            })
        );
        expect(mocks.replace).not.toHaveBeenCalled();
    });
});
