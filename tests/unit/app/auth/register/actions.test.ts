import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RegistrationInput } from '@/validation/RegisterSchema';

const { infoMock, errorMock } = vi.hoisted(() => ({
    infoMock: vi.fn(),
    errorMock: vi.fn(),
}));

vi.mock('@/lib/auth/auth', () => ({
    auth: {
        api: {
            signUpEmail: vi.fn(),
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
import { signUp } from '@/app/(auth)/register/actions';

describe('Register server action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Returns field errors for invalid registration input', async () => {
        const result = await signUp({
            name: 'A',
            email: 'invalid-email',
            password: 'weak',
            confirmPassword: 'different',
            terms: false,
        } as RegistrationInput);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.fieldErrors?.name).toContain('Name is too short');
            expect(result.fieldErrors?.email).toContain('Invalid email address');
            expect(result.fieldErrors?.confirmPassword).toContain('Passwords do not match');
            expect(result.fieldErrors?.terms).toContain('You must accept the terms and the privacy policy.');
        }
        expect(vi.mocked(auth.api.signUpEmail)).not.toHaveBeenCalled();
    });

    it('Registers user and returns success message when auth signup succeeds', async () => {
        vi.mocked(auth.api.signUpEmail).mockResolvedValueOnce({
            token: null,
            user: {
                id: 'user_123',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                email: 'jane@example.com',
                emailVerified: false,
                name: 'Jane Doe',
                image: null,
            },
        });

        const result = await signUp({
            name: '  Jane Doe  ',
            email: 'JANE@EXAMPLE.COM',
            password: 'Strong_Ab',
            confirmPassword: 'Strong_Ab',
            terms: true,
        });

        expect(vi.mocked(auth.api.signUpEmail)).toHaveBeenCalledWith({
            body: {
                name: 'Jane Doe',
                email: 'jane@example.com',
                password: 'Strong_Ab',
            },
        });
        expect(infoMock).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            success: true,
            message:
                'Registration successful! A confirmation email was sent to jane@example.com. Please check your email.',
        });
    });

    it('Returns form error when auth signup throws', async () => {
        vi.mocked(auth.api.signUpEmail).mockRejectedValueOnce(new Error('sign up failed'));

        const result = await signUp({
            name: 'Jane Doe',
            email: 'jane@example.com',
            password: 'Strong_Ab',
            confirmPassword: 'Strong_Ab',
            terms: true,
        });

        expect(result).toEqual({
            success: false,
            formError: 'Failed to register. Please try again later.',
        });
        expect(errorMock).toHaveBeenCalledTimes(1);
    });

    it('Returns the same generic error when duplicate account code is returned', async () => {
        vi.mocked(auth.api.signUpEmail).mockRejectedValueOnce({
            code: 'USER_ALREADY_EXISTS',
        });

        const result = await signUp({
            name: 'Jane Doe',
            email: 'jane@example.com',
            password: 'Strong_Ab',
            confirmPassword: 'Strong_Ab',
            terms: true,
        });

        expect(result).toEqual({
            success: false,
            formError: 'Failed to register. Please try again later.',
        });
    });

    it('Returns the same generic error when provider-linked code is returned', async () => {
        vi.mocked(auth.api.signUpEmail).mockRejectedValueOnce({
            code: 'LINKED_ACCOUNT_ALREADY_EXISTS',
        });

        const result = await signUp({
            name: 'Jane Doe',
            email: 'jane@example.com',
            password: 'Strong_Ab',
            confirmPassword: 'Strong_Ab',
            terms: true,
        });

        expect(result).toEqual({
            success: false,
            formError: 'Failed to register. Please try again later.',
        });
    });
});
