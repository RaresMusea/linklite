import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SocialAuthButtons } from '@/components/specific/auth/social/SocialAuthButtons';

describe('SocialAuthButtons Component', () => {
    it('Renders neutral Google action text and email separator when idle', () => {
        render(<SocialAuthButtons isGoogleSubmitting={false} onGoogleAuthAction={vi.fn()} />);

        expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
        expect(screen.getByText('or continue with email')).toBeInTheDocument();
    });

    it('Shows loading text while Google auth is in progress', () => {
        render(<SocialAuthButtons isGoogleSubmitting={true} onGoogleAuthAction={vi.fn()} />);

        expect(screen.getByRole('button', { name: 'Continuing with Google...' })).toBeInTheDocument();
    });

    it('Disables the button when isDisabled is true', () => {
        render(<SocialAuthButtons isGoogleSubmitting={false} isDisabled={true} onGoogleAuthAction={vi.fn()} />);

        expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeDisabled();
    });

    it('Calls onGoogleAuthAction when button is clicked', () => {
        const onGoogleAuthAction = vi.fn();
        render(<SocialAuthButtons isGoogleSubmitting={false} onGoogleAuthAction={onGoogleAuthAction} />);

        fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

        expect(onGoogleAuthAction).toHaveBeenCalledTimes(1);
    });
});
