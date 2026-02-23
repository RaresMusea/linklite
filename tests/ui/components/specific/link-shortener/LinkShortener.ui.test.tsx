import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
    toastCustom: vi.fn(),
    toastDismiss: vi.fn(),
}));

vi.mock('sonner', () => ({
    toast: {
        custom: mocks.toastCustom,
        dismiss: mocks.toastDismiss,
    },
}));

import LinkShortener from '@/components/specific/link-shortener/LinkShortener';

describe('LinkShortener component UI tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Shows shortened url on success', async () => {
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

    it('Shows error message on failure', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: false,
                json: async () => ({ success: false, error: 'bad', code: 'INTERNAL', status: 400 }),
            }))
        );

        render(<LinkShortener />);

        const inputs = screen.getAllByPlaceholderText(/enter your long url/i);
        fireEvent.change(inputs[0], {
            target: { value: 'https://example.com' },
        });

        const buttons = screen.getAllByRole('button', { name: /shorten/i });
        fireEvent.click(buttons[0]);

        expect(await screen.findByText('bad')).toBeInTheDocument();
    });

    it('Uses sonner toast with sign in/up actions for QUOTA_EXCEEDED errors', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: false,
                json: async () => ({
                    success: false,
                    error: "You've reached the anonymous limit.",
                    code: 'QUOTA_EXCEEDED',
                    status: 429,
                }),
            }))
        );

        render(<LinkShortener />);

        fireEvent.change(screen.getByPlaceholderText(/enter your long url/i), {
            target: { value: 'https://example.com' },
        });

        fireEvent.click(screen.getByRole('button', { name: /shorten/i }));

        await waitFor(() => {
            expect(mocks.toastCustom).toHaveBeenCalledTimes(1);
        });

        const [renderer, options] = mocks.toastCustom.mock.calls[0];
        expect(typeof renderer).toBe('function');
        expect(options).toMatchObject({
            id: 'quota-exceeded',
            duration: Infinity,
        });

        const renderedToast = renderer('quota-exceeded');
        render(renderedToast);
        expect(screen.getByLabelText(/close alert/i)).toBeInTheDocument();
    });
});
