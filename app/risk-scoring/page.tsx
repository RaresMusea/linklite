import React from 'react';

type PillVariant = 'none' | 'low' | 'no_info' | 'medium' | 'high';

const PILL_CLASSES: Record<PillVariant, string> = {
    none: 'bg-muted/60 border-border text-muted-foreground',
    low: 'bg-primary/15 border-primary/30 text-primary',
    no_info: 'bg-muted/60 border-border text-muted-foreground',
    medium: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-600 dark:text-yellow-400',
    high: 'bg-destructive/15 border-destructive/30 text-destructive',
};

function Pill({ children, variant }: { children: React.ReactNode; variant: PillVariant }) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${PILL_CLASSES[variant]}`}>
            {children}
        </span>
    );
}

function Row({ id, points, description }: { id: string; points: number; description: string }) {
    return (
        <tr className="border-b last:border-b-0">
            <td className="py-2 pr-4 font-mono text-sm">{id}</td>
            <td className="py-2 pr-4 text-sm">{description}</td>
            <td className="py-2 text-right font-semibold">{points}</td>
        </tr>
    );
}

export default async function RiskScoringExplainedPage() {
    return (
        <main className="mx-auto container pt-10 mt-10 max-w-4xl px-4 py-10">
            <header className="mb-8">
                <h1 className="text-3xl font-semibold tracking-tight">How redirect risk scoring works</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    This page explains how{' '}
                    <strong>
                        <span className="text-primary">Link</span>Lite
                    </strong>{' '}
                    computes a risk score for a destination URL before redirecting. The model is heuristic and additive:
                    each triggered signal adds points.
                </p>
            </header>

            <section className="mb-10 rounded-2xl border p-5">
                <h2 className="text-xl font-semibold">Scoring model</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    The score is the sum of points from all triggered signals.
                </p>

                <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="py-2 pr-4 text-left">signal</th>
                                <th className="py-2 pr-4 text-left">meaning</th>
                                <th className="py-2 text-right">points</th>
                            </tr>
                        </thead>
                        <tbody>
                            <Row id="not_https" points={1} description="The URL uses HTTP instead of HTTPS" />
                            <Row id="shortener" points={3} description="A known URL shortener was detected" />
                            <Row
                                id="suspicious_path"
                                points={2}
                                description="The path/query looks similar to phishing patterns"
                            />
                            <Row
                                id="temporary_redirect"
                                points={1}
                                description="A temporary redirect (HTTP 302) was detected"
                            />
                            <Row id="missing_tld" points={1} description="Domain metadata is missing / unavailable" />
                            <Row
                                id="tld_low_trust"
                                points={1}
                                description="The top-level domain (TLD) is classified as low trust"
                            />
                            <Row
                                id="tld_unknown"
                                points={1}
                                description="The TLD is not present in the trusted allowlist"
                            />
                            <Row id="domain_new" points={1} description="The domain appears recently registered" />
                            <Row
                                id="domain_not_allowlisted"
                                points={1}
                                description="The domain is not present in LinkLite’s internal allowlist"
                            />
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="mb-10 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border p-5">
                    <h2 className="text-xl font-semibold">Severity</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Severity represents how intense the risk appears. It is derived from the final score.
                    </p>

                    <ul className="mt-4 space-y-2 text-sm">
                        <li className="flex items-center justify-between">
                            <span>score = 0</span> <Pill variant="none">none</Pill>
                        </li>
                        <li className="flex items-center justify-between">
                            <span>score 1–2</span> <Pill variant="low">low</Pill>
                        </li>
                        <li className="flex items-center justify-between">
                            <span>score 3–4</span> <Pill variant="medium">medium</Pill>
                        </li>
                        <li className="flex items-center justify-between">
                            <span>score ≥ 5</span> <Pill variant="high">high</Pill>
                        </li>
                    </ul>
                </div>

                <div className="rounded-2xl border p-5">
                    <h2 className="text-xl font-semibold">Badge level (trust label)</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        The badge shown in the UI is a “trust label”. It is distinct from severity.
                    </p>

                    <ul className="mt-4 space-y-2 text-sm">
                        <li className="flex items-center justify-between">
                            <span>score ≥ 5</span> <Pill variant="high">high</Pill>
                        </li>
                        <li className="flex items-center justify-between">
                            <span>score 3–4</span> <Pill variant="medium">medium</Pill>
                        </li>
                        <li className="flex items-center justify-between">
                            <span>score 1–2</span> <Pill variant="no_info">no_info</Pill>
                        </li>
                        <li className="flex items-center justify-between">
                            <span>score = 0 and trusted by policy</span> <Pill variant="low">low (Verified)</Pill>
                        </li>
                        <li className="flex items-center justify-between">
                            <span>score = 0 and no trust signal</span> <Pill variant="no_info">no_info</Pill>
                        </li>
                    </ul>
                </div>
            </section>

            <section className="rounded-2xl border p-5">
                <h2 className="text-xl font-semibold">Forced-high escalation</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    Certain combinations can escalate the result to <Pill variant="high">high</Pill> regardless of the
                    final score.
                </p>

                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
                    <li>Low-trust TLD + suspicious path</li>
                    <li>Low-trust TLD + newly registered domain</li>
                    <li>Not HTTPS + suspicious path</li>
                    <li>Shortener + suspicious path</li>
                </ul>
            </section>
        </main>
    );
}
