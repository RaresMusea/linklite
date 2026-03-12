import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthBadge } from '@/components/shared/auth/AuthBadge';

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

    return { motion: { div: MotionDiv } };
});

describe('AuthBadge Component', () => {
    it('Renders LinkLite brand copy', () => {
        render(<AuthBadge />);

        expect(screen.getByText('Link')).toBeInTheDocument();
        expect(screen.getByText('Lite')).toBeInTheDocument();
    });

    it('Forwards motion props to the animated badge wrapper', () => {
        const { container } = render(<AuthBadge motionProps={{ initial: 'hidden', animate: 'show' }} />);

        const animatedWrapper = container.querySelector('[data-has-variants="true"]');
        expect(animatedWrapper).toHaveAttribute('data-initial', 'hidden');
        expect(animatedWrapper).toHaveAttribute('data-animate', 'show');
    });
});
