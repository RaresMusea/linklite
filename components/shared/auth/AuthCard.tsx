'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { AuthBadge } from '@/components/shared/auth/AuthBadge';

type AuthCardProps = {
    eyebrow: string;
    title: string;
    description: string;
    children: ReactNode;
    footer?: ReactNode;
};

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 18, scale: 0.985 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
};

export function AuthCard({ eyebrow, title, description, children, footer }: AuthCardProps) {
    const reduceMotion = useReducedMotion();
    const motionProps = reduceMotion ? {} : { initial: 'hidden', animate: 'show' };

    return (
        <motion.div
            className="relative w-full max-w-md rounded-2xl border border-border/60 bg-card/95 p-6 pt-14 shadow-xl backdrop-blur sm:p-8 sm:pt-16 lg:pt-9"
            {...motionProps}
            variants={cardVariants}
        >
            <AuthBadge motionProps={motionProps} />
            <header>
                <p className="text-sm font-medium text-primary">{eyebrow}</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </header>

            <div className="mt-8">{children}</div>

            {footer ? <footer className="mt-6 text-center text-sm text-muted-foreground">{footer}</footer> : null}
        </motion.div>
    );
}
