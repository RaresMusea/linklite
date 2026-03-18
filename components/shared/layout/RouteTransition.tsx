'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export function RouteTransition({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const reduceMotion = useReducedMotion();

    if (reduceMotion) {
        return <>{children}</>;
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
