'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Link2, Copy, Check, Loader2, Bell, TriangleAlert, X } from 'lucide-react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { isCreatedLinkResponse } from '@/dal/links/links.types';
import { isApiRouteResponseOf } from '@/lib/utils';
import { isPlainObject } from '@/lib/guards';

type ShortenErrorState = {
    message: string;
    code?: string;
    retryAfterSec?: number;
};

export default function LinkShortener() {
    const MIN_SPINNER_VISIBLE_MS = 230;
    const [url, setUrl] = useState<string>('');
    const [shortUrl, setShortUrl] = useState<string>('');
    const [error, setError] = useState<ShortenErrorState | null>(null);
    const [copied, setCopied] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [showPendingSpinner, setShowPendingSpinner] = useState<boolean>(false);
    const spinnerShownAtRef = useRef<number | null>(null);
    const hideSpinnerTimerRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (hideSpinnerTimerRef.current) {
                window.clearTimeout(hideSpinnerTimerRef.current);
            }
        };
    }, []);

    async function shortenUrl(longUrl: string) {
        const res = await fetch('/api/shorten', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: longUrl }),
        });

        const json: unknown = await res.json();

        if (!res.ok || (isPlainObject(json) && json.success === false)) {
            if (isPlainObject(json) && typeof json.error === 'string') {
                const apiError = new Error(json.error) as Error & {
                    code?: string;
                    retryAfterSec?: number;
                };
                if (typeof json.code === 'string') {
                    apiError.code = json.code;
                }
                const retryAfter = Number(
                    typeof res.headers?.get === 'function' ? res.headers.get('Retry-After') : undefined
                );
                if (Number.isFinite(retryAfter) && retryAfter > 0) {
                    apiError.retryAfterSec = retryAfter;
                }
                throw apiError;
            }
            throw new Error('Failed to shorten URL. Please try again.');
        }

        if (!isApiRouteResponseOf(json, isCreatedLinkResponse)) {
            throw new Error('Unexpected response from server.');
        }

        if (!json.success) {
            throw new Error(json.error || 'Failed to shorten URL. Please try again.');
        }

        setShortUrl(json.data.shortUrl);
        setUrl('');
        setCopied(false);
    }

    const handleShorten = (e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
        e.preventDefault();
        setError(null);
        setCopied(false);

        const trimmed = url.trim();

        if (!trimmed) {
            setError({ message: 'Please enter a URL' });
            return;
        }

        if (hideSpinnerTimerRef.current) {
            window.clearTimeout(hideSpinnerTimerRef.current);
            hideSpinnerTimerRef.current = null;
        }

        spinnerShownAtRef.current = Date.now();
        setShowPendingSpinner(true);
        setIsSubmitting(true);

        shortenUrl(trimmed)
            .catch((err: unknown) => {
                console.error(err);
                const known = err as { message?: unknown; code?: unknown; retryAfterSec?: unknown };
                const nextError = {
                    message:
                        typeof known.message === 'string' && known.message
                            ? known.message
                            : 'Failed to shorten URL. Please try again.',
                    code: typeof known.code === 'string' ? known.code : undefined,
                    retryAfterSec:
                        typeof known.retryAfterSec === 'number' && Number.isFinite(known.retryAfterSec)
                            ? known.retryAfterSec
                            : undefined,
                };

                if (nextError.code === 'QUOTA_EXCEEDED') {
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
                                                    window.location.assign('/signup');
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
                    setError(null);
                    return;
                }

                if (nextError.code === 'RATE_LIMITED') {
                    const retryHint =
                        typeof nextError.retryAfterSec === 'number'
                            ? `Please try again in ${nextError.retryAfterSec} second${nextError.retryAfterSec === 1 ? '' : 's'}.`
                            : 'Please wait a bit and try again.';

                    toast.warning('Rate limit reached', {
                        description: `Too many requests from this IP. ${retryHint}`,
                        icon: <TriangleAlert className="h-4 w-4 text-primary" />,
                        duration: Infinity,
                        closeButton: true,
                        dismissible: true,
                        className: '!bg-popover/75 !backdrop-blur-md',
                    });
                    setError(null);
                    return;
                }

                setError(nextError);
            })
            .finally(() => {
                setIsSubmitting(false);
                const shownAt = spinnerShownAtRef.current ?? Date.now();
                const elapsed = Date.now() - shownAt;
                const remaining = Math.max(0, MIN_SPINNER_VISIBLE_MS - elapsed);

                hideSpinnerTimerRef.current = window.setTimeout(() => {
                    setShowPendingSpinner(false);
                    hideSpinnerTimerRef.current = null;
                }, remaining);
            });
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shortUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <>
            <div className="w-full max-w-2xl mx-auto mt-10">
                {/* FORM */}
                <form
                    onSubmit={handleShorten}
                    className="bg-background/70 backdrop-blur-lg shadow-xl rounded-2xl p-6 border border-border/40 space-y-4 animate-fade-in"
                >
                    <div className="flex items-center gap-3 p-2 bg-accent/30 rounded-xl border border-border/50">
                        <Link2 className="h-5 w-5 text-muted-foreground ml-2" />

                        <Input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="Enter your long URL here..."
                            disabled={isSubmitting}
                            className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none shadow-none text-base"
                        />

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 disabled:opacity-60"
                        >
                            {showPendingSpinner ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="animate-spin h-5 w-5" />
                                    Shortening...
                                </span>
                            ) : (
                                'Shorten'
                            )}
                        </Button>
                    </div>

                    {error?.code !== 'QUOTA_EXCEEDED' && error ? (
                        <p className="text-sm text-destructive mt-1">{error.message}</p>
                    ) : null}
                </form>

                {shortUrl && !error && (
                    <Card className="mt-6 border-border/40 bg-background/60 backdrop-blur-lg shadow-xl rounded-2xl animate-fade-in">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Your shortened URL</CardTitle>
                            <CardDescription className="text-xs">
                                Share this link and track its performance from your dashboard.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Input
                                type="text"
                                readOnly
                                value={shortUrl}
                                className="flex-1 font-medium bg-background/60 text-primary border border-border/50"
                            />

                            <Button
                                type="button"
                                onClick={handleCopy}
                                className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2"
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-4 w-4" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-4 w-4" />
                                        Copy
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}
