import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ForgotPasswordInput } from '@/validation/ForgotPasswordSchema';

const mocks = vi.hoisted(() => ({
    requestPasswordReset: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
}));

vi.mock('@/app/(auth)/forgot-password/actions', () => ({
    requestPasswordReset: mocks.requestPasswordReset,
}));

vi.mock('sonner', () => ({
    toast: {
        success: mocks.toastSuccess,
        error: mocks.toastError,
    },
}));

import { useForgotPasswordForm } from '@/components/specific/auth/password-reset/hooks/useForgotPasswordForm';

const validPayload: ForgotPasswordInput = {
    email: 'jane@example.com',
};

describe('useForgotPasswordForm hook tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Exposes default form state', () => {
        const { result } = renderHook(() => useForgotPasswordForm());

        expect(result.current.isSubmitting).toBe(false);
        expect(result.current.errors.email).toBeUndefined();
    });

    it('Shows success toast when forgot-password request succeeds', async () => {
        mocks.requestPasswordReset.mockResolvedValueOnce({
            success: true,
            message: 'Password reset email sent.',
        });

        const { result } = renderHook(() => useForgotPasswordForm());

        await act(async () => {
            await result.current.onSubmit(validPayload);
        });

        expect(mocks.requestPasswordReset).toHaveBeenCalledWith(validPayload);
        expect(mocks.toastSuccess).toHaveBeenCalledWith(
            'Password reset email sent.',
            expect.objectContaining({
                duration: 4000,
                closeButton: true,
                dismissible: true,
                className: expect.stringContaining('register-success-toast'),
            })
        );
    });

    it('Shows form error toast when backend returns formError', async () => {
        mocks.requestPasswordReset.mockResolvedValueOnce({
            success: false,
            formError: 'Unable to request a password reset right now. Please try again.',
        });

        const { result } = renderHook(() => useForgotPasswordForm());

        await act(async () => {
            await result.current.onSubmit(validPayload);
        });

        expect(mocks.toastError).toHaveBeenCalledWith(
            'Unable to request a password reset right now. Please try again.',
            expect.objectContaining({
                duration: 4000,
                closeButton: true,
                dismissible: true,
            })
        );
    });

    it('Maps field errors to react-hook-form state and skips fallback toast', async () => {
        mocks.requestPasswordReset.mockResolvedValueOnce({
            success: false,
            fieldErrors: {
                email: ['Invalid email address'],
            },
        });

        const { result } = renderHook(() => useForgotPasswordForm());

        await act(async () => {
            await result.current.onSubmit(validPayload);
        });

        expect(result.current.errors.email?.message).toBe('Invalid email address');
        expect(mocks.toastError).not.toHaveBeenCalled();
    });

    it('Shows fallback error toast when response has no formError and no field errors', async () => {
        mocks.requestPasswordReset.mockResolvedValueOnce({
            success: false,
        });

        const { result } = renderHook(() => useForgotPasswordForm());

        await act(async () => {
            await result.current.onSubmit(validPayload);
        });

        expect(mocks.toastError).toHaveBeenCalledWith(
            'Unable to request password reset. Please try again.',
            expect.objectContaining({
                duration: 4000,
                closeButton: true,
                dismissible: true,
            })
        );
    });
});
