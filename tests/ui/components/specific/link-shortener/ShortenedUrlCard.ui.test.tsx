import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ShortenedUrlCard } from '@/components/specific/link-shortener/ShortenedUrlCard';

describe('ShortenedUrlCard component UI tests', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('Renders short url card content', () => {
        render(<ShortenedUrlCard shortUrl="https://short.ly/abc" />);

        expect(screen.getByText('Your shortened URL')).toBeInTheDocument();
        expect(screen.getByDisplayValue('https://short.ly/abc')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    });

    it('Copies url and toggles button text to Copied then back to Copy', async () => {
        vi.useFakeTimers();

        const writeText = vi.fn(async () => undefined);
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText },
        });

        render(<ShortenedUrlCard shortUrl="https://short.ly/abc" />);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
            await Promise.resolve();
        });

        expect(writeText).toHaveBeenCalledWith('https://short.ly/abc');

        expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
        vi.useRealTimers();
    });

    it('Logs clipboard errors and keeps Copy label', async () => {
        const writeText = vi.fn(async () => {
            throw new Error('clipboard failed');
        });

        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText },
        });

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        render(<ShortenedUrlCard shortUrl="https://short.ly/abc" />);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
            await Promise.resolve();
        });

        expect(consoleErrorSpy).toHaveBeenCalled();

        expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Copied!' })).not.toBeInTheDocument();
    });
});
