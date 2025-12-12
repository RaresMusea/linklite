'use client';

import Link from 'next/link';
import { motion, stagger, Variants } from 'framer-motion';
import { termsSections } from '@/app/terms/TermsSections';

const containerVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: 'easeOut',
        },
    },
};

const listVariants: Variants = {
    hidden: { opacity: 0, y: 8 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            delayChildren: stagger(0.05),
        },
    },
};

const listItemVariants: Variants = {
    hidden: { opacity: 0, y: 4 },
    show: { opacity: 1, y: 0 },
};

const sectionVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.25,
            delay: 0.1 + i * 0.03,
        },
    }),
};

export default function TermsContent() {
    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={containerVariants}
            className="max-w-4xl mx-auto px-4 pt-24 pb-16"
        >
            {/* Header */}
            <motion.header className="mb-10" variants={containerVariants}>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Legal</p>
                <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                    Terms &amp; Conditions
                </h1>
                <p className="mt-3 text-sm sm:text-base text-muted-foreground">
                    Last updated: <span className="font-medium">December 12, 2025</span>
                </p>
            </motion.header>

            <motion.div
                className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 sm:p-8 shadow-sm"
                variants={containerVariants}
            >
                <motion.section className="mb-8" variants={containerVariants}>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        These Terms &amp; Conditions (&quot;Terms&quot;) govern your access to and use of the{' '}
                        <span className="font-semibold">LinkLite</span> platform, including any related websites,
                        products, and services (collectively, the &quot;Service&quot;). By accessing or using the
                        Service, you agree to be bound by these Terms.
                    </p>
                </motion.section>

                <motion.section className="mb-10" variants={containerVariants}>
                    <h2 className="text-lg font-semibold text-foreground mb-3">Table of Contents</h2>
                    <motion.ol
                        className="list-decimal list-inside space-y-1 text-sm text-muted-foreground"
                        variants={listVariants}
                    >
                        {termsSections.map((section) => (
                            <motion.li key={section.id} variants={listItemVariants}>
                                <Link
                                    href={`#${section.id}`}
                                    className="hover:text-foreground transition-colors"
                                >
                                    {section.title}
                                </Link>
                            </motion.li>
                        ))}
                    </motion.ol>
                </motion.section>

                <div className="space-y-8 text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {termsSections.map((section, index) => (
                        <motion.section
                            key={section.id}
                            id={section.id}
                            custom={index}
                            variants={sectionVariants}
                        >
                            <h2 className="text-lg font-semibold text-foreground mb-2">
                                {index + 1}. {section.title}
                            </h2>
                            {section.body}
                        </motion.section>
                    ))}

                    <motion.section
                        className="pt-4 border-t border-border text-xs text-muted-foreground"
                        variants={containerVariants}
                    >
                        <p>
                            This document is provided for informational purposes only and does not constitute legal
                            advice. For a fully compliant version, please consult with a qualified legal
                            professional.
                        </p>
                    </motion.section>
                </div>
            </motion.div>
        </motion.div>
    );
}
