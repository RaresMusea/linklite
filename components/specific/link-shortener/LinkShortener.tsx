'use client';

import React, { useState, useTransition } from 'react';
import { Link2, Copy, Check, Loader2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { isCreatedLinkResponse } from '@/dal/links/links.types';
import { isApiRouteResponseOf } from '@/lib/utils';

export default function LinkShortener() {
    const [url, setUrl] = useState<string>('');
    const [shortUrl, setShortUrl] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [copied, setCopied] = useState<boolean>(false);

    const [isPending, startTransition] = useTransition();

    async function shortenUrl(longUrl: string) {
        const res = await fetch('/api/shorten', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: longUrl }),
        });

        const json = await res.json();
        console.log(json);

        if (!isApiRouteResponseOf(json, isCreatedLinkResponse)) throw new Error('Bad shape');

        if (!res.ok || !json.success) {
            throw new Error('Link shortened failed');
        }

        setShortUrl(json.data.shortUrl as string);
        setUrl('');
        setCopied(false);
    }

    const handleShorten = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setShortUrl('');
        setCopied(false);

        const trimmed = url.trim();

        if (!trimmed) {
            setError('Please enter a URL');
            return;
        }

        startTransition(() => {
            shortenUrl(trimmed).catch((err) => {
                console.error(err);
                setError(err.message || 'Failed to shorten URL. Please try again.');
            });
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
                        disabled={isPending}
                        className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none shadow-none text-base"
                    />

                    <Button
                        type="submit"
                        disabled={isPending}
                        className="px-6 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 disabled:opacity-60"
                    >
                        {isPending ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin h-5 w-5" />
                                Shortening...
                            </span>
                        ) : (
                            'Shorten'
                        )}
                    </Button>
                </div>

                {error && <p className="text-sm text-destructive mt-1">{error}</p>}
            </form>

            {shortUrl && !error && (
                <Card
                    key={shortUrl}
                    className="mt-6 border-border/40 bg-background/60 backdrop-blur-lg shadow-xl rounded-2xl animate-fade-in"
                >
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
    );
}
