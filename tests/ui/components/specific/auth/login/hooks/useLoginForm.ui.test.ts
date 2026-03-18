import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LoginInput } from '@/validation/LoginSchema';

const mocks = vi.hoisted(() => ({
    signIn: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    replace: vi.fn(),
}));

vi.mock('@/app/(auth)/signin/actions', () => ({
    signIn: mocks.signIn,
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

import { useLoginForm } from '@/components/specific/auth/login/hooks/useLoginForm';

const validPayload: LoginInput = {
    email: 'jane@example.com',
    password: 'Strong_Ab',
};

describe('useLoginForm hook tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Exposes default form state', () => {
        const { result } = renderHook(() => useLoginForm());

        expect(result.current.isSubmitting).toBe(false);
        expect(result.current.errors.email).toBeUndefined();
        expect(result.current.errors.password).toBeUndefined();
    });

    it('Shows success toast and redirects to post-login when sign-in succeeds', async () => {
        mocks.signIn.mockResolvedValueOnce({
            success: true,
            message: 'Signed in successfully.',
        });

        const { result } = renderHook(() => useLoginForm());

        await act(async () => {
            await result.current.onSubmit(validPayload);
        });

        expect(mocks.signIn).toHaveBeenCalledWith(validPayload);
        expect(mocks.toastSuccess).toHaveBeenCalledWith(
            'Signed in successfully.',
            expect.objectContaining({
                duration: 3500,
                closeButton: true,
                dismissible: true,
            })
        );
        expect(mocks.replace).toHaveBeenCalledWith('/post-login');
    });

    it('Shows form error toast when backend returns formError', async () => {
        mocks.signIn.mockResolvedValueOnce({
            success: false,
            formError: 'Unable to sign in. Please check your credentials and try again.',
        });

        const { result } = renderHook(() => useLoginForm());

        await act(async () => {
            await result.current.onSubmit(validPayload);
        });

        expect(mocks.toastError).toHaveBeenCalledWith(
            'Unable to sign in. Please check your credentials and try again.',
            expect.objectContaining({
                duration: 3500,
                closeButton: true,
                dismissible: true,
            })
        );
        expect(mocks.replace).not.toHaveBeenCalled();
    });

    it('Maps field errors to react-hook-form state and skips fallback toast', async () => {
        mocks.signIn.mockResolvedValueOnce({
            success: false,
            fieldErrors: {
                email: ['Invalid email address'],
            },
        });

        const { result } = renderHook(() => useLoginForm());

        await act(async () => {
            await result.current.onSubmit(validPayload);
        });

        expect(result.current.errors.email?.message).toBe('Invalid email address');
        expect(mocks.toastError).not.toHaveBeenCalled();
    });

    it('Shows fallback toast when there is no formError and no field errors', async () => {
        mocks.signIn.mockResolvedValueOnce({
            success: false,
        });

        const { result } = renderHook(() => useLoginForm());

        await act(async () => {
            await result.current.onSubmit(validPayload);
        });

        expect(mocks.toastError).toHaveBeenCalledWith(
            'Unable to log in into your account. Please try again.',
            expect.objectContaining({
                duration: 3500,
                closeButton: true,
                dismissible: true,
            })
        );
        expect(mocks.replace).not.toHaveBeenCalled();
    });
});
