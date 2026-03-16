import { MailCheck, Sparkles, Heart } from 'lucide-react';

const BUBBLES = [
    { size: 'h-2.5 w-2.5', delay: '0ms' },
    { size: 'h-2 w-2', delay: '200ms' },
    { size: 'h-3 w-3', delay: '420ms' },
    { size: 'h-2 w-2', delay: '620ms' },
];

function SkeletonLine({ className }: { className: string }) {
    return <div className={`h-3 rounded-full bg-primary/12 ${className}`} />;
}

export default function Loading() {
    return (
        <section aria-live="polite" aria-busy="true" className="w-full max-w-md">
            <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-6 shadow-xl backdrop-blur sm:p-8">
                <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/8 via-transparent to-chart-1/10" />
                <div className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-chart-1/20 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-primary/20 blur-2xl" />

                <div className="relative z-10">
                    <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                        Verifying email
                    </div>

                    <div className="mt-6 flex items-center justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
                            <div className="relative flex h-16 w-16 animate-bounce items-center justify-center rounded-2xl border border-primary/25 bg-background/90 [animation-duration:1.8s]">
                                <MailCheck className="h-8 w-8 text-primary" />
                            </div>
                            <Heart className="absolute -right-3 -bottom-2 h-4 w-4 animate-pulse text-chart-1" />
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Almost there...</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            We are confirming your verification link and preparing your account.
                        </p>
                    </div>

                    <div className="mt-6 space-y-2.5">
                        <SkeletonLine className="w-11/12 animate-pulse" />
                        <SkeletonLine className="w-9/12 animate-pulse [animation-delay:150ms]" />
                        <SkeletonLine className="w-10/12 animate-pulse [animation-delay:300ms]" />
                    </div>

                    <div className="mt-6 flex items-center justify-center gap-2">
                        {BUBBLES.map((bubble) => (
                            <span
                                key={`${bubble.size}-${bubble.delay}`}
                                className={`${bubble.size} inline-block rounded-full bg-primary/35 animate-pulse`}
                                style={{ animationDelay: bubble.delay }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
