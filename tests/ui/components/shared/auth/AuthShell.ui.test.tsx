import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthShell } from '@/components/shared/auth/AuthShell';

const useReducedMotionMock = vi.fn(() => false);

vi.mock('@/components/shared/ThemeToggler', () => ({
    ThemeToggler: () => <div data-testid="theme-toggler">Theme Toggler</div>,
}));

vi.mock('framer-motion', async () => {
    const ReactModule = await import('react');
    const toDataValue = (value: unknown) => (value === undefined ? 'undefined' : String(value));
    type MotionMockProps = {
        children?: React.ReactNode;
        initial?: unknown;
        animate?: unknown;
        variants?: unknown;
    } & React.HTMLAttributes<HTMLElement>;

    const createMotionComponent = (tag: 'main' | 'section' | 'div') =>
        ReactModule.forwardRef<HTMLElement, MotionMockProps>(
            ({ children, initial, animate, variants, ...props }, ref) =>
                ReactModule.createElement(
                    tag,
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
        motion: {
            main: createMotionComponent('main'),
            section: createMotionComponent('section'),
            div: createMotionComponent('div'),
        },
        useReducedMotion: () => useReducedMotionMock(),
    };
});

describe('AuthShell Component', () => {
    beforeEach(() => {
        useReducedMotionMock.mockReset();
        useReducedMotionMock.mockReturnValue(false);
    });

    describe('Layout Rendering', () => {
        it('Renders shell copy, features, toggler, and children', () => {
            render(
                <AuthShell>
                    <div>Register Form</div>
                </AuthShell>
            );

            expect(screen.getByText('Join LinkLite')).toBeInTheDocument();
            expect(screen.getByText('Build cleaner links and share with confidence.')).toBeInTheDocument();
            expect(screen.getByText('Track clicks and performance with real-time analytics')).toBeInTheDocument();
            expect(screen.getByText('Safer redirects with transparent risk scoring')).toBeInTheDocument();
            expect(screen.getByText('Register Form')).toBeInTheDocument();
            expect(screen.getByTestId('theme-toggler')).toBeInTheDocument();
        });
    });

    describe('Motion Preferences', () => {
        it('Applies animated states when reduced motion is disabled', () => {
            useReducedMotionMock.mockReturnValue(false);

            const { container } = render(
                <AuthShell>
                    <div>Content</div>
                </AuthShell>
            );

            const main = container.querySelector('main');
            expect(main).toHaveAttribute('data-initial', 'hidden');
            expect(main).toHaveAttribute('data-animate', 'show');
            expect(main).toHaveAttribute('data-has-variants', 'true');
        });

        it('Disables animated states when reduced motion is enabled', () => {
            useReducedMotionMock.mockReturnValue(true);

            const { container } = render(
                <AuthShell>
                    <div>Content</div>
                </AuthShell>
            );

            const main = container.querySelector('main');
            expect(main).toHaveAttribute('data-initial', 'false');
            expect(main).toHaveAttribute('data-animate', 'undefined');
            expect(main).toHaveAttribute('data-has-variants', 'true');
        });
    });
});
