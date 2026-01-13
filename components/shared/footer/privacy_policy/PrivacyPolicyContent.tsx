'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { privacySections } from '@/components/shared/footer/privacy_policy/PrivacyPolicySections';
import {
    containerVariants,
    listItemVariants,
    listVariants,
    sectionVariants,
} from '@/components/shared/footer/Animations';

export default function PrivacyContent() {
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
                <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
                <p className="mt-3 text-sm sm:text-base text-muted-foreground">
                    Last updated: <span className="font-medium">December 12, 2025</span>
                </p>
            </motion.header>

            {/* Card */}
            <motion.div
                className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 sm:p-8 shadow-sm"
                variants={containerVariants}
            >
                {/* Intro */}
                <motion.section className="mb-8" variants={containerVariants}>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        This Privacy Policy describes how <span className="font-semibold">LinkLite</span> collects,
                        uses, and protects your information when you use our Service. Please read it carefully to
                        understand our practices regarding your personal data.
                    </p>
                </motion.section>

                {/* Table of contents */}
                <motion.section className="mb-10" variants={containerVariants}>
                    <h2 className="text-lg font-semibold text-foreground mb-3">Table of Contents</h2>
                    <motion.ol
                        className="list-decimal list-inside space-y-1 text-sm text-muted-foreground"
                        variants={listVariants}
                    >
                        {privacySections.map((section) => (
                            <motion.li key={section.id} variants={listItemVariants}>
                                <Link href={`#${section.id}`} className="hover:text-foreground transition-colors">
                                    {section.title}
                                </Link>
                            </motion.li>
                        ))}
                    </motion.ol>
                </motion.section>

                {/* Sections */}
                <div className="space-y-8 text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {privacySections.map((section, index) => (
                        <motion.section
                            key={section.id}
                            id={section.id}
                            custom={index}
                            variants={sectionVariants}
                            className="scroll-mt-24"
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
                            This Policy is provided for informational purposes only and does not constitute legal
                            advice. For specific guidance tailored to your situation, please consult with a qualified
                            legal professional.
                        </p>
                    </motion.section>
                </div>
            </motion.div>
        </motion.div>
    );
}
