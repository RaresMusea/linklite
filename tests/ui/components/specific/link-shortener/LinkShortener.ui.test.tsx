import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { isValidElement } from 'react';

const mocks = vi.hoisted(() => ({
    toastCustom: vi.fn(),
    toastDismiss: vi.fn(),
    toastWarning: vi.fn(),
}));

vi.mock('sonner', () => ({
    toast: {
        custom: mocks.toastCustom,
        dismiss: mocks.toastDismiss,
        warning: mocks.toastWarning,
    },
}));

import LinkShortener from '@/components/specific/link-shortener/LinkShortener';

describe('LinkShortener component UI tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
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

    it('Uses sonner warning toast for RATE_LIMITED with Retry-After seconds', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: false,
                headers: {
                    get: vi.fn((name: string) => (name === 'Retry-After' ? '42' : null)),
                },
                json: async () => ({
                    success: false,
                    error: 'Too many requests',
                    code: 'RATE_LIMITED',
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
            expect(mocks.toastWarning).toHaveBeenCalledTimes(1);
        });

        expect(mocks.toastCustom).not.toHaveBeenCalled();

        const [title, options] = mocks.toastWarning.mock.calls[0];
        expect(title).toBe('Rate limit reached');
        expect(options).toMatchObject({
            duration: Infinity,
            closeButton: true,
            dismissible: true,
            className: '!bg-popover/75 !backdrop-blur-md',
        });
        expect(options.description).toContain('Too many requests from this IP.');
        expect(options.description).toContain('42 seconds');
        expect(isValidElement(options.icon)).toBe(true);
        expect((options.icon as { props?: { className?: string } }).props?.className).toContain('text-primary');
    });

    it('Disables shorten button during rate-limit cooldown and re-enables after timeout', async () => {
        vi.useFakeTimers();
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: false,
                headers: {
                    get: vi.fn((name: string) => (name === 'Retry-After' ? '2' : null)),
                },
                json: async () => ({
                    success: false,
                    error: 'Too many requests',
                    code: 'RATE_LIMITED',
                    status: 429,
                }),
            }))
        );

        render(<LinkShortener />);

        fireEvent.change(screen.getByPlaceholderText(/enter your long url/i), {
            target: { value: 'https://example.com' },
        });
        fireEvent.click(screen.getByRole('button', { name: /shorten/i }));

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
            await vi.advanceTimersByTimeAsync(250);
        });
        expect(screen.getByRole('button', { name: /retry in 2s/i })).toBeDisabled();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });
        expect(screen.getByRole('button', { name: /retry in 1s/i })).toBeDisabled();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });
        expect(screen.getByRole('button', { name: /shorten/i })).toBeEnabled();
        expect(mocks.toastDismiss).toHaveBeenCalledWith('rate-limit-reached');
    });

    it('Uses fallback message for RATE_LIMITED when Retry-After is missing', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: false,
                json: async () => ({
                    success: false,
                    error: 'Too many requests',
                    code: 'RATE_LIMITED',
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
            expect(mocks.toastWarning).toHaveBeenCalledTimes(1);
        });

        const [, options] = mocks.toastWarning.mock.calls[0];
        expect(options.description).toContain('Please wait a bit and try again.');
    });

    it('Keeps spinner visible for a minimum duration even for fast responses', async () => {
        vi.useFakeTimers();
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
        expect(screen.getByText(/shortening\.\.\./i)).toBeInTheDocument();

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(screen.getByText(/shortening\.\.\./i)).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(40);
        });
        expect(screen.getByRole('button', { name: /shorten/i })).toBeInTheDocument();

        vi.useRealTimers();
    });

    it('Shows spinner again on subsequent shorten attempts', async () => {
        vi.useFakeTimers();
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

        const input = screen.getByPlaceholderText(/enter your long url/i);
        const button = screen.getByRole('button', { name: /shorten/i });

        fireEvent.change(input, { target: { value: 'https://example.com' } });
        fireEvent.click(button);
        expect(screen.getByText(/shortening\.\.\./i)).toBeInTheDocument();

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        act(() => {
            vi.advanceTimersByTime(300);
        });
        expect(screen.getByRole('button', { name: /shorten/i })).toBeInTheDocument();

        fireEvent.change(input, { target: { value: 'https://example.org' } });
        fireEvent.click(screen.getByRole('button', { name: /shorten/i }));
        expect(screen.getByText(/shortening\.\.\./i)).toBeInTheDocument();

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
            vi.advanceTimersByTime(300);
        });
    });
});
