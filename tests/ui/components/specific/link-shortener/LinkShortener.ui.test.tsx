import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LinkShortener from '@/components/specific/link-shortener/LinkShortener';

describe('LinkShortener', () => {
    it('shows shortened url on success', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: true,
                json: async () => ({
                    success: true,
                    data: { created: { id: '1', slug: 'a', targetUrl: 'x', ownerId: null }, shortUrl: 'http://x/a' },
                }),
            })) as never
        );

        render(<LinkShortener />);

        fireEvent.change(screen.getByPlaceholderText(/enter your long url/i), {
            target: { value: 'https://example.com' },
        });

        fireEvent.click(screen.getByRole('button', { name: /shorten/i }));

        expect(await screen.findByDisplayValue('http://x/a')).toBeInTheDocument();
    });

    it('shows error message on failure', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: false,
                json: async () => ({ success: false, error: 'bad', status: 400 }),
            }))
        );

        render(<LinkShortener />);

        const inputs = screen.getAllByPlaceholderText(/enter your long url/i);
        fireEvent.change(inputs[0], {
            target: { value: 'https://example.com' },
        });

        const buttons = screen.getAllByRole('button', { name: /shorten/i });
        fireEvent.click(buttons[0]);

        expect(await screen.findByText(/Link shortened failed/i)).toBeInTheDocument();
    });
});
