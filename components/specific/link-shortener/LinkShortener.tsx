'use client';

import React, { useState } from 'react';
import { Link2, Loader2, Bell, TriangleAlert, X } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRateLimit } from '@/components/specific/link-shortener/hooks/useRateLimit';
import { useMinDurationSpinner } from '@/hooks/ui/useMinDurationSpinner';
import { shortenUrl } from '@/http/shorten';
import { ShortenedUrlCard } from '@/components/specific/link-shortener/ShortenedUrlCard';

type ShortenErrorState = {
    message: string;
    code?: string;
    retryAfterSec?: number;
};

function toShortenError(err: unknown): ShortenErrorState {
    if (err instanceof Error) {
        const e = err as Error & { code?: string; retryAfterSec?: number };
        return {
            message: e.message || 'Failed to shorten URL. Please try again.',
            code: e.code,
            retryAfterSec: e.retryAfterSec,
        };
    }
    return { message: 'Failed to shorten URL. Please try again.' };
}

export function showQuotaExceededToast(nextError: ShortenErrorState) {
    toast.custom(
        (id) => (
            <div className="relative w-full rounded-xl border border-border bg-popover/90 p-5 text-popover-foreground shadow-2xl backdrop-blur-md">
                <button
                    type="button"
                    aria-label="Close alert"
                    className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                    onClick={() => toast.dismiss(id)}
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="flex items-start gap-3 pr-8">
                    <div className="mt-0.5 rounded-full bg-primary/10 p-2">
                        <Bell className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold">Anonymous limit reached</p>
                        <p className="mt-1 text-sm text-muted-foreground">{nextError.message}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                    toast.dismiss(id);
                                    window.location.assign('/register');
                                }}
                            >
                                Sign up
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    toast.dismiss(id);
                                    window.location.assign('/signin');
                                }}
                            >
                                Sign in
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        ),
        {
            id: 'quota-exceeded',
            duration: Infinity,
            className: 'quota-toast !border-0 !bg-transparent !shadow-none !p-0 !m-0',
            style: {
                position: 'fixed',
                left: '50%',
                right: 'auto',
                bottom: '20px',
                top: 'auto',
                transform: 'translateX(-50%)',
                width: 'min(92vw, 760px)',
                maxWidth: '760px',
                margin: 0,
                zIndex: 100,
            },
        }
    );
}

export function showRateLimitToast(nextError: ShortenErrorState) {
    const RATE_LIMIT_TOAST_ID = 'rate-limit-reached';

    const retryHint =
        typeof nextError.retryAfterSec === 'number'
            ? `Please try again in ${nextError.retryAfterSec} second${nextError.retryAfterSec === 1 ? '' : 's'}.`
            : 'Please wait a bit and try again.';

    toast.warning('Rate limit reached', {
        description: `Too many requests from this IP. ${retryHint}`,
        icon: <TriangleAlert className="h-4 w-4 text-primary" />,
        duration: Infinity,
        id: RATE_LIMIT_TOAST_ID,
        closeButton: true,
        dismissible: true,
        className: '!bg-popover/75 !backdrop-blur-md',
    });
}

export default function LinkShortener() {
    const { rateLimitRemainingSec, isRateLimited, startCooldown } = useRateLimit();
    const [url, setUrl] = useState<string>('');
    const [shortUrl, setShortUrl] = useState<string>('');
    const [error, setError] = useState<ShortenErrorState | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const { spinnerVisible, showSpinner, hideSpinner } = useMinDurationSpinner();

    const handleShorten = (e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
        e.preventDefault();
        setError(null);

        if (isRateLimited) return;

        const trimmed = url.trim();
        if (!trimmed) {
            setError({ message: 'Please enter a URL' });
            return;
        }

        showSpinner();
        setIsSubmitting(true);

        shortenUrl(trimmed)
            .then((result) => {
                setShortUrl(result);
                setUrl('');
            })
            .catch((err: unknown) => {
                console.error(err);
                const nextError = toShortenError(err);

                if (nextError.code === 'QUOTA_EXCEEDED') {
                    showQuotaExceededToast(nextError);
                    setError(null);
                    return;
                }

                if (nextError.code === 'RATE_LIMITED') {
                    startCooldown(nextError.retryAfterSec);
                    showRateLimitToast(nextError);
                    setError(null);
                    return;
                }

                setError(nextError);
            })
            .finally(() => {
                setIsSubmitting(false);
                hideSpinner();
            });
    };

    return (
        <div className="mx-auto mt-10 w-full max-w-2xl px-4 sm:px-0">
            <form
                onSubmit={handleShorten}
                className="animate-fade-in space-y-4 rounded-2xl border border-border/40 bg-background/70 p-4 shadow-xl backdrop-blur-lg sm:p-6"
            >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 sm:rounded-xl sm:border sm:border-border/50 sm:bg-accent/30 sm:p-2">
                    <div className="flex h-11 w-full items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-3">
                        <Link2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <Input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="Enter your long URL here..."
                            disabled={isSubmitting}
                            className="h-full flex-1 border-none bg-transparent px-2 text-base placeholder:text-sm sm:placeholder:text-base shadow-none focus-visible:ring-0"
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={isSubmitting || isRateLimited}
                        className="h-10 w-full shrink-0 rounded-xl bg-primary px-6 py-1.5 text-primary-foreground transition-all duration-200 hover:bg-primary/90 disabled:opacity-60 sm:h-9 sm:w-auto"
                    >
                        {spinnerVisible ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="animate-spin h-5 w-5" /> Shortening...
                            </span>
                        ) : isRateLimited ? (
                            `Retry in ${rateLimitRemainingSec}s`
                        ) : (
                            'Shorten'
                        )}
                    </Button>
                </div>
                {error && error.code !== 'QUOTA_EXCEEDED' && (
                    <p className="text-sm text-destructive mt-1">{error.message}</p>
                )}
            </form>

            {shortUrl && !error && <ShortenedUrlCard shortUrl={shortUrl} />}
        </div>
    );
}
