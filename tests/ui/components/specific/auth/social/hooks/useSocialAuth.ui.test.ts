import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    signInSocial: vi.fn(),
    toastError: vi.fn(),
}));

vi.mock('@/lib/auth/auth-client', () => ({
    authClient: {
        signIn: {
            social: mocks.signInSocial,
        },
    },
}));

vi.mock('sonner', () => ({
    toast: {
        error: mocks.toastError,
    },
}));

import { useSocialAuth } from '@/components/specific/auth/social/hooks/useSocialAuth';

describe('useSocialAuth hook tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Exposes default state', () => {
        const { result } = renderHook(() => useSocialAuth());

        expect(result.current.isGoogleSubmitting).toBe(false);
    });

    it('Starts Google auth flow with expected provider and callback URL', async () => {
        mocks.signInSocial.mockResolvedValueOnce(undefined);

        const { result } = renderHook(() => useSocialAuth());

        await act(async () => {
            await result.current.onGoogleAuth();
        });

        expect(mocks.signInSocial).toHaveBeenCalledWith({
            provider: 'google',
            callbackURL: '/post-login',
        });
        expect(mocks.toastError).not.toHaveBeenCalled();
    });

    it('Shows toast when Google auth flow fails', async () => {
        mocks.signInSocial.mockRejectedValueOnce(new Error('oauth failure'));

        const { result } = renderHook(() => useSocialAuth());

        await act(async () => {
            await result.current.onGoogleAuth();
        });

        expect(mocks.toastError).toHaveBeenCalledWith(
            'Unable to continue with Google. Please try again.',
            expect.objectContaining({
                duration: 5000,
                closeButton: true,
                dismissible: true,
            })
        );
        expect(result.current.isGoogleSubmitting).toBe(false);
    });
});
