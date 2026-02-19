'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, Check, Copy, ExternalLink, Globe, Link2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import RiskBadge from '@/components/specific/redirect-interstitial/RiskBadge';

import { RiskReason, RiskResult } from '@/lib/redirect_safety/redirect_scoring_risk_calculator';
import { RISK_REASON_LABEL } from '@/lib/redirect_safety/redirect_risk_labels';
import { useRedirectPhase } from '@/components/specific/redirect-interstitial/hooks/useRedirectPhase';
import { useCopyUrl } from '@/components/specific/redirect-interstitial/hooks/useCopyUrl';
import { useFavicon } from '@/components/specific/redirect-interstitial/hooks/useFavicon';

type RedirectInterstitialProps = {
    slug: string;
    targetUrl: string;
    hostname?: string;
    riskScore: RiskResult;
};

const AUTO_REDIRECT: Record<RiskResult['level'], { enabled: boolean; delayMs: number }> = {
    low: { enabled: true, delayMs: 2000 },
    no_info: { enabled: true, delayMs: 4500 },
    medium: { enabled: false, delayMs: 0 },
    high: { enabled: false, delayMs: 0 },
};

function safeHostnameFromUrl(url: string): string | undefined {
    try {
        const u = new URL(url);
        return u.hostname || undefined;
    } catch {
        return undefined;
    }
}

export default function RedirectInterstitial(props: RedirectInterstitialProps) {
    const { targetUrl, riskScore } = props;
    const [riskPopoverOpen, setRiskPopoverOpen] = useState(false);

    const derivedHostname = useMemo(
        () => props.hostname?.trim() || safeHostnameFromUrl(targetUrl) || undefined,
        [props.hostname, targetUrl]
    );

    const autoPolicy = AUTO_REDIRECT[riskScore.level];
    const autoDelayMs = autoPolicy.enabled ? autoPolicy.delayMs : 0;

    const reasonLabels = useMemo(
        () => riskScore.reasons.map((r) => (RISK_REASON_LABEL as Record<RiskReason, string>)[r] ?? r),
        [riskScore.reasons]
    );

    const { phase, progress, secondsLeft, showFallback } = useRedirectPhase(
        autoDelayMs,
        targetUrl,
        autoPolicy.enabled,
        riskPopoverOpen
    );

    const { faviconUrl, faviconOk, onFaviconError } = useFavicon(derivedHostname);
    const { copied, handleCopyUrl } = useCopyUrl(targetUrl);

    const handleOpenNow = () => {
        if (!targetUrl) return;
        try {
            window.location.assign(targetUrl);
        } catch {
            window.location.href = targetUrl;
        }
    };

    return (
        <>
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center overflow-hidden relative">
                {/* Background */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-background to-accent/15" />

                    <div
                        className={[
                            'absolute -top-40 -right-40 w-125 h-125 rounded-full mix-blend-multiply blur-[100px] transition-all duration-1000',
                            'bg-linear-to-br from-primary/35 to-accent/30',
                            phase !== 'skeleton' ? 'opacity-45 animate-[float_8s_ease-in-out_infinite]' : 'opacity-0',
                        ].join(' ')}
                    />

                    <div
                        className={[
                            'absolute top-1/2 -left-60 w-150 h-150 rounded-full mix-blend-multiply blur-[120px] transition-all duration-1000',
                            'bg-linear-to-br from-accent/35 to-primary/25',
                            phase !== 'skeleton'
                                ? 'opacity-40 animate-[float_10s_ease-in-out_infinite_reverse]'
                                : 'opacity-0',
                        ].join(' ')}
                        style={{ animationDelay: '1s' }}
                    />

                    <div
                        className={[
                            'absolute -bottom-40 right-1/4 w-105 h-105 rounded-full mix-blend-multiply blur-[80px] transition-all duration-1000',
                            'bg-linear-to-br from-primary/30 to-accent/30',
                            phase !== 'skeleton' ? 'opacity-35 animate-[float_12s_ease-in-out_infinite]' : 'opacity-0',
                        ].join(' ')}
                        style={{ animationDelay: '2s' }}
                    />
                </div>

                <div className="relative z-10 flex flex-col items-center gap-6 px-6 w-full max-w-md">
                    {/* Skeleton */}
                    {phase === 'skeleton' && (
                        <div className="w-full flex flex-col items-center gap-6 animate-pulse">
                            <div className="w-20 h-20 bg-secondary/50 rounded-2xl" />
                            <div className="w-full space-y-3">
                                <div className="h-8 bg-secondary/50 rounded-lg w-3/4 mx-auto" />
                                <div className="h-4 bg-secondary/30 rounded w-1/2 mx-auto" />
                            </div>
                            <div className="w-full h-44 bg-secondary/30 rounded-2xl" />
                            <div className="w-full h-2 bg-secondary/30 rounded-full" />
                        </div>
                    )}

                    {/* Content */}
                    {phase !== 'skeleton' && (
                        <>
                            {/* Logo */}
                            <div className="animate-[bounce-in_0.5s_cubic-bezier(0.2,0.6,0.2,1)_forwards]">
                                <div className="w-20 h-20 bg-linear-to-br from-accent to-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/30 relative overflow-hidden">
                                    <ArrowUpRight className="w-10 h-10 text-primary-foreground relative z-10" />
                                    <div className="absolute inset-0 bg-linear-to-t from-foreground/20 to-transparent" />
                                    <div className="absolute -inset-1 bg-linear-to-br from-accent to-primary rounded-2xl blur-lg opacity-50 -z-10" />
                                </div>
                            </div>

                            {/* Title */}
                            <div className="text-center space-y-2 animate-[slide-up_0.6s_0.1s_cubic-bezier(0.2,0.6,0.2,1)_forwards] opacity-0">
                                <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                                    {phase === 'ready' ? 'Redirecting now' : 'Preparing redirect'}
                                </h1>
                                <p className="text-muted-foreground">
                                    {phase === 'ready'
                                        ? 'Opening your destination...'
                                        : autoPolicy.enabled
                                          ? 'Verifying your destination...'
                                          : 'Please review the destination before continuing.'}
                                </p>
                            </div>

                            {/* Card */}
                            <div className="w-full animate-[slide-up_0.6s_0.15s_cubic-bezier(0.2,0.6,0.2,1)_forwards] opacity-0">
                                <div className="bg-secondary/60 backdrop-blur-2xl border border-border/50 rounded-2xl p-5 space-y-4 relative overflow-hidden shadow-2xl shadow-primary/10">
                                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-linear-to-r from-transparent via-foreground/10 to-transparent" />
                                    <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

                                    {/* Header */}
                                    <div className="flex items-center gap-3 relative">
                                        <div className="w-12 h-12 bg-background/80 rounded-xl flex items-center justify-center border border-border/50 shadow-lg relative overflow-hidden">
                                            {faviconUrl && faviconOk ? (
                                                <Image
                                                    src={faviconUrl}
                                                    alt={`${derivedHostname ?? 'destination'} favicon`}
                                                    width={28}
                                                    height={28}
                                                    className="rounded"
                                                    onError={onFaviconError}
                                                    priority
                                                />
                                            ) : (
                                                <Globe className="w-6 h-6 text-primary" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                                                Destination
                                            </p>
                                            <p className="font-semibold text-foreground truncate">
                                                {derivedHostname ?? 'Unknown host'}
                                            </p>
                                        </div>

                                        <RiskBadge
                                            risk={riskScore}
                                            reasonLabels={reasonLabels}
                                            onOpenChangeAction={setRiskPopoverOpen}
                                        />
                                    </div>

                                    {/* URL box */}
                                    <div className="bg-background/60 backdrop-blur-md rounded-xl p-3 border border-border/50 relative group">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs text-muted-foreground">Full URL</p>
                                            <button
                                                type="button"
                                                onClick={handleCopyUrl}
                                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                                disabled={!targetUrl}
                                            >
                                                {copied ? (
                                                    <>
                                                        <Check className="w-3.5 h-3.5 text-primary animate-[scale-in_0.2s_ease-out]" />
                                                        <span className="text-primary">Copied!</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-3.5 h-3.5" />
                                                        <span>Copy</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-sm font-mono text-foreground/80 truncate">
                                            {targetUrl || '...'}
                                        </p>
                                    </div>

                                    {/* CTA */}
                                    <Button
                                        onClick={handleOpenNow}
                                        className="w-full gap-2 h-12 text-base font-semibold relative overflow-hidden group"
                                        disabled={!targetUrl}
                                    >
                                        <span className="relative z-10 flex items-center gap-2">
                                            <ExternalLink className="w-4 h-4 group-hover:animate-[bounce_0.65s_ease-in-out]" />
                                            Open now
                                        </span>
                                        <div className="absolute inset-0 bg-linear-to-r from-accent/35 to-primary/35 opacity-0 group-hover:opacity-60 transition-opacity duration-300" />
                                    </Button>

                                    {/* If not auto-redirecting, show a hint */}
                                    {!autoPolicy.enabled && (
                                        <p className="text-xs text-muted-foreground">
                                            Auto-redirect is disabled for{' '}
                                            <span className="font-semibold">{riskScore.level}</span> risk links.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Progress */}
                            <div
                                className={[
                                    'w-full space-y-3 transition-all duration-500',
                                    phase === 'progress' || phase === 'ready'
                                        ? 'animate-[slide-up_0.5s_cubic-bezier(0.2,0.6,0.2,1)_forwards]'
                                        : 'opacity-0 translate-y-4',
                                ].join(' ')}
                            >
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {phase === 'ready'
                                            ? 'Complete'
                                            : autoPolicy.enabled
                                              ? secondsLeft != null
                                                  ? `Redirecting in ${secondsLeft}s...`
                                                  : 'Redirecting...'
                                              : 'Ready'}
                                    </span>
                                    <span className="font-mono font-semibold text-foreground">
                                        {Math.round(progress)}%
                                    </span>
                                </div>

                                <div className="h-3 bg-secondary/60 backdrop-blur-md rounded-full overflow-hidden border border-border/50 relative shadow-inner">
                                    <div
                                        className="h-full w-full origin-left bg-linear-to-r from-primary via-accent to-primary bg-size-[200%_100%] animate-[gradient-shift_2s_linear_infinite] rounded-full transition-transform duration-100 ease-out relative will-change-transform"
                                        style={{ transform: `scaleX(${Math.max(0, Math.min(progress, 100)) / 100})` }}
                                    >
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-primary rounded-full blur-md opacity-80" />
                                        <div className="absolute inset-0 bg-linear-to-b from-foreground/25 to-transparent rounded-full" />
                                    </div>
                                </div>
                            </div>

                            {/* Powered by */}
                            <div className="animate-[slide-up_0.6s_0.4s_cubic-bezier(0.2,0.6,0.2,1)_forwards] opacity-0">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/40 border border-border/50 backdrop-blur-xl shadow-lg">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/90">
                                        <Link2 className="w-4 h-4 text-primary-foreground" />
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        Powered by{' '}
                                        <b>
                                            <span className="text-primary">Link</span>Lite
                                        </b>
                                    </span>
                                </div>
                            </div>

                            <a
                                href={targetUrl}
                                rel="noopener noreferrer nofollow"
                                className={`redirect-fallback ${showFallback ? 'is-visible' : ''}`}
                            >
                                If you&apos;re not redirected, click here
                            </a>
                        </>
                    )}
                </div>

                <style jsx>{`
                    @keyframes slide-up {
                        from {
                            opacity: 0;
                            transform: translateY(30px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    @keyframes bounce-in {
                        0% {
                            opacity: 0;
                            transform: scale(0.3) rotate(-10deg);
                        }
                        50% {
                            transform: scale(1.1) rotate(3deg);
                        }
                        70% {
                            transform: scale(0.95) rotate(-2deg);
                        }
                        100% {
                            opacity: 1;
                            transform: scale(1) rotate(0);
                        }
                    }

                    @keyframes shimmer {
                        100% {
                            transform: translateX(200%);
                        }
                    }

                    @keyframes gradient-shift {
                        0% {
                            background-position: 0 50%;
                        }
                        100% {
                            background-position: 200% 50%;
                        }
                    }

                    @keyframes float {
                        0%,
                        100% {
                            transform: translateY(0) scale(1);
                        }
                        50% {
                            transform: translateY(-30px) scale(1.05);
                        }
                    }

                    @keyframes scale-in {
                        0% {
                            transform: scale(0);
                        }
                        50% {
                            transform: scale(1.2);
                        }
                        100% {
                            transform: scale(1);
                        }
                    }
                `}</style>
            </div>
        </>
    );
}
