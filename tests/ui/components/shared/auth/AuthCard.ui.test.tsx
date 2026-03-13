import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthCard } from '@/components/shared/auth/AuthCard';

const useReducedMotionMock = vi.fn(() => false);

vi.mock('framer-motion', async () => {
    const ReactModule = await import('react');
    const toDataValue = (value: unknown) => (value === undefined ? 'undefined' : String(value));

    type MotionMockProps = {
        children?: React.ReactNode;
        initial?: unknown;
        animate?: unknown;
        variants?: unknown;
    } & React.HTMLAttributes<HTMLElement>;

    const MotionDiv = ReactModule.forwardRef<HTMLElement, MotionMockProps>(
        ({ children, initial, animate, variants, ...props }, ref) =>
            ReactModule.createElement(
                'div',
                {
                    ...props,
                    ref,
                    'data-initial': toDataValue(initial),
                    'data-animate': toDataValue(animate),
                    'data-has-variants': variants ? 'true' : 'false',
                },
                children
            )
    );

    return {
        motion: { div: MotionDiv },
        useReducedMotion: () => useReducedMotionMock(),
    };
});

describe('AuthCard Component', () => {
    beforeEach(() => {
        useReducedMotionMock.mockReset();
        useReducedMotionMock.mockReturnValue(false);
    });

    it('Renders card content, children, and footer', () => {
        render(
            <AuthCard
                eyebrow="Create account"
                title="Register"
                description="Fill in your details."
                footer={<span>Already have an account?</span>}
            >
                <form aria-label="register-form">Form body</form>
            </AuthCard>
        );

        expect(screen.getByText('Create account')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument();
        expect(screen.getByText('Fill in your details.')).toBeInTheDocument();
        expect(screen.getByRole('form', { name: 'register-form' })).toBeInTheDocument();
        expect(screen.getByText('Already have an account?')).toBeInTheDocument();
        expect(screen.getByText('Link')).toBeInTheDocument();
        expect(screen.getByText('Lite')).toBeInTheDocument();
    });

    it('Omits footer when no footer is provided', () => {
        render(
            <AuthCard eyebrow="Welcome" title="Sign in" description="Access your account.">
                <div>Child content</div>
            </AuthCard>
        );

        expect(screen.queryByText('Already have an account?')).not.toBeInTheDocument();
    });

    it('Applies animation props when reduced motion is disabled', () => {
        useReducedMotionMock.mockReturnValue(false);

        const { container } = render(
            <AuthCard eyebrow="Welcome" title="Sign in" description="Access your account.">
                <div>Child content</div>
            </AuthCard>
        );

        const animatedWrappers = container.querySelectorAll('[data-has-variants="true"]');
        expect(animatedWrappers.length).toBeGreaterThan(1);
        expect(animatedWrappers[0]).toHaveAttribute('data-initial', 'hidden');
        expect(animatedWrappers[0]).toHaveAttribute('data-animate', 'show');
    });

    it('Disables animation props when reduced motion is enabled', () => {
        useReducedMotionMock.mockReturnValue(true);

        const { container } = render(
            <AuthCard eyebrow="Welcome" title="Sign in" description="Access your account.">
                <div>Child content</div>
            </AuthCard>
        );

        const animatedWrappers = container.querySelectorAll('[data-has-variants="true"]');
        expect(animatedWrappers.length).toBeGreaterThan(1);
        expect(animatedWrappers[0]).toHaveAttribute('data-initial', 'undefined');
        expect(animatedWrappers[0]).toHaveAttribute('data-animate', 'undefined');
    });
});
