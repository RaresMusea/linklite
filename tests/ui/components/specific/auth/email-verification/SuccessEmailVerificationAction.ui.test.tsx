import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SuccessRedirectActions } from '@/components/specific/auth/email-verification/SuccessEmailVerificationAction';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        replace: replaceMock,
    }),
}));

describe('SuccessEmailVerificationAction component UI tests', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        replaceMock.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('Renders the sign in action and initial 6-second countdown text', () => {
        render(<SuccessRedirectActions />);

        expect(screen.getByRole('link', { name: 'Sign in to your account' })).toHaveAttribute('href', '/signin');
        expect(screen.getByText('You will be redirected to sign in in 6 seconds.')).toBeInTheDocument();
    });

    it('Updates countdown text over time and uses singular second at 1', async () => {
        render(<SuccessRedirectActions />);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(5_000);
        });

        expect(screen.getByText('You will be redirected to sign in in 1 second.')).toBeInTheDocument();
    });

    it('Redirects to sign-in after 6 seconds', async () => {
        render(<SuccessRedirectActions />);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(6_000);
        });

        expect(replaceMock).toHaveBeenCalledTimes(1);
        expect(replaceMock).toHaveBeenCalledWith('/signin');
    });
});
