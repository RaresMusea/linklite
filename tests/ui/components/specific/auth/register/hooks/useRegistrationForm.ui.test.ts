import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RegistrationInput } from '@/validation/RegisterSchema';

const mocks = vi.hoisted(() => ({
    signUp: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
}));

vi.mock('@/app/(auth)/register/actions', () => ({
    signUp: mocks.signUp,
}));

vi.mock('sonner', () => ({
    toast: {
        success: mocks.toastSuccess,
        error: mocks.toastError,
    },
}));

import { useRegistrationForm } from '@/components/specific/auth/register/hooks/useRegistrationForm';

const validPayload: RegistrationInput = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'Strong_Ab',
    confirmPassword: 'Strong_Ab',
    terms: true,
};

describe('useRegistrationForm hook tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Exposes default form state', () => {
        const { result } = renderHook(() => useRegistrationForm());

        expect(result.current.isSubmitting).toBe(false);
        expect(result.current.passwordValue).toBe('');
        expect(result.current.errors.name).toBeUndefined();
    });

    it('Updates watched password value when password changes', () => {
        const { result } = renderHook(() => useRegistrationForm());

        act(() => {
            const passwordField = result.current.register('password');
            passwordField.onChange({
                target: {
                    name: 'password',
                    value: 'Strong_Ab',
                },
                type: 'change',
            });
        });

        expect(result.current.passwordValue).toBe('Strong_Ab');
    });

    it('Shows success toast when registration succeeds', async () => {
        mocks.signUp.mockResolvedValueOnce({
            success: true,
            message: 'Registration successful.',
        });

        const { result } = renderHook(() => useRegistrationForm());

        await act(async () => {
            await result.current.onSubmit(validPayload);
        });

        expect(mocks.signUp).toHaveBeenCalledWith(validPayload);
        expect(mocks.toastSuccess).toHaveBeenCalledWith(
            'Registration successful.',
            expect.objectContaining({
                duration: 5000,
                closeButton: true,
                dismissible: true,
            })
        );
    });

    it('Shows form error toast when backend returns formError', async () => {
        mocks.signUp.mockResolvedValueOnce({
            success: false,
            formError: 'Failed to register. Please try again later.',
        });

        const { result } = renderHook(() => useRegistrationForm());

        await act(async () => {
            await result.current.onSubmit(validPayload);
        });

        expect(mocks.toastError).toHaveBeenCalledWith(
            'Failed to register. Please try again later.',
            expect.objectContaining({
                duration: 5000,
                closeButton: true,
                dismissible: true,
            })
        );
    });

    it('Maps field errors to react-hook-form state and skips fallback toast', async () => {
        mocks.signUp.mockResolvedValueOnce({
            success: false,
            fieldErrors: {
                email: ['Invalid email address'],
            },
        });

        const { result } = renderHook(() => useRegistrationForm());

        await act(async () => {
            await result.current.onSubmit(validPayload);
        });

        expect(result.current.errors.email?.message).toBe('Invalid email address');
        expect(mocks.toastError).not.toHaveBeenCalled();
    });

    it('Shows fallback error toast when response has no formError and no field errors', async () => {
        mocks.signUp.mockResolvedValueOnce({
            success: false,
        });

        const { result } = renderHook(() => useRegistrationForm());

        await act(async () => {
            await result.current.onSubmit(validPayload);
        });

        expect(mocks.toastError).toHaveBeenCalledWith(
            'Unable to create account. Please try again.',
            expect.objectContaining({
                duration: 5000,
                closeButton: true,
                dismissible: true,
            })
        );
    });

});
