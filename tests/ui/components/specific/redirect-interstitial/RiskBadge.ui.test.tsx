import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import RiskBadge from '@/components/specific/redirect-interstitial/RiskBadge';
import type { RiskResult } from '@/lib/redirect_safety/redirect_scoring_risk_calculator';
import type { ReactNode } from 'react';

vi.mock('next/link', () => ({
    default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

function makeRisk(
    level: RiskResult['level'],
    score: number,
    severity: RiskResult['severity'] = 'none',
    reasons: RiskResult['reasons'] = []
): RiskResult {
    return { level, severity, score, reasons };
}

describe('RiskBadge component UI tests', () => {
    it.each([
        ['low', 'Verified'],
        ['no_info', 'Unverified'],
        ['medium', 'Moderate Risk'],
        ['high', 'High Risk'],
    ] as const)('renders outside badge label for %s risk', (level, expectedLabel) => {
        render(<RiskBadge risk={makeRisk(level, 1, 'low')} reasonLabels={[]} />);

        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });

    it('Opens popover and shows severity, reasons and score details', async () => {
        render(
            <RiskBadge
                risk={makeRisk('medium', 4, 'medium', ['shortener', 'suspicious_path'])}
                reasonLabels={['Known shortener domain', 'Suspicious URL path']}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /view risk analysis/i }));

        expect(await screen.findByText('Risk analysis')).toBeInTheDocument();
        expect(screen.getByText('Severity')).toBeInTheDocument();
        expect(screen.getByText('Medium')).toBeInTheDocument();
        expect(screen.getByText('REASONS')).toBeInTheDocument();
        expect(screen.getByText('Known shortener domain')).toBeInTheDocument();
        expect(screen.getByText('Suspicious URL path')).toBeInTheDocument();
        expect(screen.getByText('Risk score')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('Shows no-suspicious-signals message when no reasons exist', async () => {
        render(<RiskBadge risk={makeRisk('low', 0, 'none')} reasonLabels={[]} />);

        fireEvent.click(screen.getByRole('button', { name: /view risk analysis/i }));

        expect(await screen.findByText(/No suspicious signals detected\./i)).toBeInTheDocument();
    });

    it('Renders the help link at the bottom of popover', async () => {
        render(<RiskBadge risk={makeRisk('high', 6, 'high')} reasonLabels={['Temporary redirect']} />);

        fireEvent.click(screen.getByRole('button', { name: /view risk analysis/i }));

        const link = await screen.findByRole('link', { name: /How do we calculate the risk scoring\?/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/terms');
    });
});
