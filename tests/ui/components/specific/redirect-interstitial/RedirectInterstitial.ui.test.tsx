import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import RedirectInterstitial from '@/components/specific/redirect-interstitial/RedirectInterstitial';
import type { RiskResult } from '@/lib/redirect_safety/redirect_scoring_risk_calculator';

vi.mock('next/image', () => ({
    default: ({ priority: _priority, ...props }: Record<string, unknown>) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img {...props} alt={String(props.alt ?? '')} />
    ),
}));

vi.mock('next/link', () => ({
    default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

function makeRisk(level: RiskResult['level']): RiskResult {
    return {
        level,
        severity: level === 'high' ? 'high' : level === 'medium' ? 'medium' : 'low',
        score: level === 'low' ? 1 : 6,
        reasons: level === 'low' ? [] : ['suspicious_path'],
    };
}

describe('RedirectInterstitial pause/resume UI tests', () => {
    let now = 0;
    let rafQueue: FrameRequestCallback[] = [];

    const runRaf = (timestamp: number) => {
        const cb = rafQueue.shift();
        expect(cb).toBeDefined();
        cb!(timestamp);
    };

    const getProgressFill = (container: HTMLElement): HTMLDivElement => {
        const fill = container.querySelector('div.origin-left');
        expect(fill).toBeInstanceOf(HTMLDivElement);
        return fill as HTMLDivElement;
    };

    const readScale = (el: HTMLElement): number => {
        const style = el.getAttribute('style') ?? '';
        const match = style.match(/scaleX\(([^)]+)\)/);
        expect(match).not.toBeNull();
        return Number(match![1]);
    };

    beforeEach(() => {
        vi.useFakeTimers();
        now = 0;
        rafQueue = [];

        vi.spyOn(performance, 'now').mockImplementation(() => now);
        vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
            rafQueue.push(cb);
            return rafQueue.length;
        });
        vi.stubGlobal('cancelAnimationFrame', () => undefined);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('Pauses countdown and bar fill while risk popover is open, then resumes', async () => {
        const { container } = render(
            <RedirectInterstitial
                slug="abc"
                targetUrl="https://example.com"
                hostname="example.com"
                riskScore={makeRisk('low')}
            />
        );

        await act(async () => {
            await vi.advanceTimersByTimeAsync(600);
        });

        now = 400;
        await act(async () => {
            runRaf(now);
        });

        const fill = getProgressFill(container);
        const scaleBeforePause = readScale(fill);
        const percentBeforePause = screen.getByText(/^\d+%$/).textContent;

        fireEvent.click(screen.getByRole('button', { name: /view risk analysis/i }));
        expect(screen.getByText('Risk analysis')).toBeInTheDocument();

        now = 1400;
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });

        expect(screen.getByText(/^\d+%$/).textContent).toBe(percentBeforePause);
        expect(readScale(fill)).toBe(scaleBeforePause);

        fireEvent.click(screen.getByRole('button', { name: /view risk analysis/i }));

        now = 1700;
        await act(async () => {
            runRaf(now);
        });

        const scaleAfterResume = readScale(fill);
        const percentAfterResume = Number((screen.getByText(/^\d+%$/).textContent ?? '0%').replace('%', ''));
        const percentBefore = Number((percentBeforePause ?? '0%').replace('%', ''));

        expect(scaleAfterResume).toBeGreaterThan(scaleBeforePause);
        expect(percentAfterResume).toBeGreaterThan(percentBefore);
    });

    it('Shows fallback link after timeout when auto redirect is enabled', async () => {
        const { container } = render(
            <RedirectInterstitial
                slug="abc"
                targetUrl="https://example.com"
                hostname="example.com"
                riskScore={makeRisk('low')}
            />
        );

        await act(async () => {
            await vi.advanceTimersByTimeAsync(600);
        });

        const fallback = container.querySelector('a.redirect-fallback');
        expect(fallback).toBeInTheDocument();
        expect(fallback).not.toHaveClass('is-visible');

        await act(async () => {
            await vi.advanceTimersByTimeAsync(10_000);
        });

        expect(fallback).toHaveClass('is-visible');
    });

    it('Does not show fallback link when auto redirect is disabled', async () => {
        const { container } = render(
            <RedirectInterstitial
                slug="abc"
                targetUrl="https://example.com"
                hostname="example.com"
                riskScore={makeRisk('medium')}
            />
        );

        await act(async () => {
            await vi.advanceTimersByTimeAsync(600);
        });

        const fallback = container.querySelector('a.redirect-fallback');
        expect(fallback).toBeInTheDocument();
        expect(fallback).not.toHaveClass('is-visible');
        expect(screen.getByText(/auto-redirect is disabled/i)).toBeInTheDocument();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(20_000);
        });

        expect(fallback).not.toHaveClass('is-visible');
    });
});
