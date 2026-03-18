"use client";

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertCircle, Home, Search } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center overflow-hidden relative">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-linear-to-br from-accent to-primary rounded-full mix-blend-screen opacity-40 blur-3xl animate-pulse" />
                <div
                    className="absolute top-1/2 -left-40 w-96 h-96 bg-gt-to-br from-accent to-primary rounded-full mix-blend-screen opacity-35 blur-3xl animate-pulse"
                    style={{ animationDelay: '1s' }}
                />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center max-w-2xl">
                <div className="animate-fade-in">
                    <div className="relative">
                        <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center border border-border">
                            <AlertCircle className="w-12 h-12 text-destructive" />
                        </div>
                        <div className="absolute inset-0 w-24 h-24 bg-destructive rounded-full opacity-20 blur-2xl animate-pulse" />
                    </div>
                </div>

                <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <h1 className="text-6xl md:text-7xl font-bold text-foreground">404</h1>
                    <h2 className="text-2xl md:text-3xl font-semibold text-foreground">Link Not Found</h2>
                    <p className="text-lg text-muted-foreground max-w-md">
                        The short link you&apos;re looking for doesn&apos;t exist or may have expired. Please check the URL and
                        try again.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <Button asChild size="lg" className="gap-2">
                        <Link href="/">
                            <Home className="w-4 h-4" />
                            Go Home
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="gap-2 bg-transparent">
                        <Link href="/">
                            <Search className="w-4 h-4" />
                            Create Short Link
                        </Link>
                    </Button>
                </div>

                {/* Help Text */}
                <div className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
                    <p className="text-sm text-muted-foreground">
                        Need help?{' '}
                        <Link href="/" className="text-primary hover:underline">
                            Contact support
                        </Link>
                    </p>
                </div>
            </div>

            <style jsx>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .animate-fade-in {
                    animation: fade-in 0.8s cubic-bezier(0.2, 0.6, 0.2, 1);
                    animation-fill-mode: forwards;
                    opacity: 0;
                }
            `}</style>
        </div>
    );
}
