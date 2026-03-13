'use client';

import { Link2 } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';

type AuthBadgeProps = {
    motionProps?: { initial?: string; animate?: string };
};

const badgeVariants: Variants = {
    hidden: { opacity: 0, y: 10, scale: 0.99 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.45, delay: 0.09, ease: [0.22, 1, 0.36, 1] },
    },
};

export function AuthBadge({ motionProps }: AuthBadgeProps) {
    return (
        <motion.div
            className="absolute left-5 top-0 -translate-y-[35%] lg:hidden"
            {...motionProps}
            variants={badgeVariants}
        >
            <div className="inline-flex items-center gap-3 rounded-3xl border border-border/60 bg-card/95 px-3 py-2.5 pr-4 shadow-md backdrop-blur">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                    <Link2 className="h-5 w-5" />
                </div>
                <p className="text-[1.95rem] leading-none font-semibold tracking-tight text-foreground">
                    Link<span className="text-primary">Lite</span>
                </p>
            </div>
        </motion.div>
    );
}
