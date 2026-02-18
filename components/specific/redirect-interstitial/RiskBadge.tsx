'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { RiskResult } from '@/lib/redirect_safety/redirect_scoring_risk_calculator';
import { Shield } from 'lucide-react';
import Link from 'next/link';

type Props = {
    risk: RiskResult;
    reasonLabels: string[];
};

const LEVEL_CONFIG = {
    low: {
        label: 'Low',
        badgeLabel: 'Low Risk',
        classes: 'bg-primary/15 border-primary/30 text-primary',
        dotClass: 'bg-primary/70',
        textClass: 'text-foreground',
    },
    medium: {
        label: 'Medium',
        badgeLabel: 'Moderate Risk',
        classes: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-500',
        dotClass: 'bg-yellow-500/80',
        textClass: 'text-yellow-600 dark:text-yellow-400',
    },
    high: {
        label: 'High',
        badgeLabel: 'High Risk',
        classes: 'bg-destructive/15 border-destructive/30 text-destructive',
        dotClass: 'bg-destructive/80',
        textClass: 'text-destructive',
    },
} satisfies Record<RiskResult['level'], object>;

const MAX_REASONS_DISPLAYED = 6;

function RiskReasons({ reasonLabels }: { reasonLabels: string[] }) {
    return (
        <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">REASONS</p>
            {reasonLabels.length === 0 ? (
                <p className="rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-sm text-muted-foreground">
                    No suspicious signals detected.
                </p>
            ) : (
                <ul className="space-y-1.5">
                    {reasonLabels.slice(0, MAX_REASONS_DISPLAYED).map((t, i) => (
                        <li
                            key={i}
                            className="rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-sm text-muted-foreground"
                        >
                            {t}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function RiskBadge({ risk, reasonLabels }: Props) {
    const config = LEVEL_CONFIG[risk.level];

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label="View risk analysis"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition shrink-0 ${config.classes}`}
                >
                    <Shield className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{config.badgeLabel}</span>
                </button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                className="w-80 overflow-hidden rounded-xl border-border/60 bg-popover/95 p-0 shadow-xl shadow-primary/10 backdrop-blur-xl"
            >
                <div className="h-1 w-full bg-primary" />
                <div className="space-y-4 p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Shield className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Risk analysis</p>
                                <p className="text-xs text-muted-foreground">Automated redirection security checks</p>
                            </div>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-card/70 px-2.5 py-1.5">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Severity</p>
                            <p className={`mt-0.5 flex items-center gap-1.5 text-xs font-semibold ${config.textClass}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
                                {config.label}
                            </p>
                        </div>
                    </div>

                    <RiskReasons reasonLabels={reasonLabels} />

                    {/* Score */}
                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/70 px-3 py-2">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">Risk score</span>
                        <span className="font-mono text-sm text-foreground">{risk.score}</span>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-border/60 pt-2 text-center">
                        <Link
                            href="/terms"
                            className="text-xs text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground transition-colors"
                        >
                            How do we calculate the risk scoring?
                        </Link>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
