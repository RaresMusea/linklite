import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { StatusPanel } from '@/components/specific/auth/email-verification/StatusPanel';

function TestIcon({ className }: { className?: string }) {
    return <svg data-testid="status-icon" className={className} />;
}

describe('StatusPanel Component', () => {
    it('Renders hint text and icon', () => {
        render(
            <StatusPanel
                icon={TestIcon}
                iconClassName="text-emerald-500"
                panelClassName="border-emerald-500/30 bg-emerald-500/10"
                hint="Your email was verified successfully."
            />
        );

        expect(screen.getByText('Your email was verified successfully.')).toBeInTheDocument();
        expect(screen.getByTestId('status-icon')).toBeInTheDocument();
    });

    it('Applies panel and icon class names', () => {
        const { container } = render(
            <StatusPanel
                icon={TestIcon}
                iconClassName="text-amber-500"
                panelClassName="border-amber-500/30 bg-amber-500/10"
                hint="We are still waiting for verification."
            />
        );

        const panel = container.firstElementChild;
        const icon = screen.getByTestId('status-icon');

        expect(panel).toHaveClass('rounded-xl', 'border', 'px-4', 'py-4');
        expect(panel).toHaveClass('border-amber-500/30', 'bg-amber-500/10');
        expect(icon).toHaveClass('mt-0.5', 'h-5', 'w-5', 'shrink-0');
        expect(icon).toHaveClass('text-amber-500');
    });
});
