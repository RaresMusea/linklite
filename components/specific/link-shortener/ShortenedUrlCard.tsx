import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

export function ShortenedUrlCard({ shortUrl }: { shortUrl: string }) {
    const [copied, setCopied] = useState(false);

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
        <Card className="mt-6 border-border/40 bg-background/60 backdrop-blur-lg shadow-xl rounded-2xl animate-fade-in">
            <CardHeader className="pb-2">
                <CardTitle className="text-base">Your shortened URL</CardTitle>
                <CardDescription className="text-xs">
                    Share this link and track its performance from your dashboard.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
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
    );
}
