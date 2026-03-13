'use client';

import type { ReactNode } from 'react';
import { Link2, ShieldCheck } from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ThemeToggler } from '@/components/shared/ThemeToggler';

type AuthShellProps = {
    children: ReactNode;
};

const shellVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.28, ease: 'easeOut' } },
};

const leftPaneVariants: Variants = {
    hidden: { opacity: 0, x: -24 },
    show: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.05 },
    },
};

const leftContentVariants: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.14 },
    },
};

const FEATURES = [
    { icon: Link2, text: 'Track clicks and performance with real-time analytics' },
    { icon: ShieldCheck, text: 'Safer redirects with transparent risk scoring' },
];

export function AuthShell({ children }: AuthShellProps) {
    const reduceMotion = useReducedMotion();

    return (
        <motion.main
            className="min-h-screen bg-background"
            initial={reduceMotion ? false : 'hidden'}
            animate={reduceMotion ? undefined : 'show'}
            variants={shellVariants}
        >
            <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
                <motion.section
                    className="relative hidden overflow-hidden lg:flex lg:items-center"
                    variants={leftPaneVariants}
                >
                    <div className="absolute inset-0 bg-linear-to-br from-primary via-primary/85 to-chart-2" />
                    <div className="absolute inset-0 bg-radial-[circle_at_80%_85%] from-chart-1/55 via-transparent to-transparent" />
                    <div className="absolute -top-24 right-16 h-72 w-72 rounded-full bg-background/10 blur-3xl" />
                    <div className="absolute bottom-16 left-10 h-64 w-64 rounded-full bg-background/15 blur-3xl" />

                    <motion.div
                        className="relative z-10 mx-auto w-full max-w-xl px-10 py-20 text-primary-foreground"
                        variants={leftContentVariants}
                    >
                        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-2 text-sm font-medium">
                            <Link2 className="h-4 w-4" />
                            Join LinkLite
                        </div>

                        <h2 className="text-5xl leading-tight font-semibold">
                            Build cleaner links and share with confidence.
                        </h2>

                        <p className="mt-6 max-w-lg text-lg text-primary-foreground/85">
                            Create your account to manage short links, view safety insights, and keep campaigns
                            organized from one focused workspace.
                        </p>

                        <div className="mt-12 space-y-4 text-sm">
                            {FEATURES.map(({ icon: Icon, text }) => (
                                <div key={text} className="flex items-center gap-3 ...">
                                    <Icon className="h-4 w-4 shrink-0" />
                                    {text}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </motion.section>

                <section className="relative flex items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-10">
                    <div className="absolute inset-0 bg-linear-to-br from-primary via-primary/85 to-chart-2 lg:hidden" />
                    <div className="absolute inset-0 bg-radial-[circle_at_78%_82%] from-chart-1/55 via-transparent to-transparent lg:hidden" />
                    <div className="absolute -bottom-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-background/20 blur-3xl lg:hidden" />
                    <div className="absolute inset-0 bg-linear-to-b from-background/80 via-background/75 to-muted/55 lg:from-background lg:via-background lg:to-muted/40" />
                    <div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
                        <ThemeToggler />
                    </div>
                    <div className="relative z-10 flex w-full justify-center">{children}</div>
                </section>
            </div>
        </motion.main>
    );
}
