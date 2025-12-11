'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import { BarChart3, Shield, Zap, LinkIcon, Clock, Eye } from 'lucide-react';

const features = [
    {
        icon: Zap,
        title: 'Lightning Fast',
        description: 'Create shortened links instantly with our optimized infrastructure.',
    },
    {
        icon: BarChart3,
        title: 'Detailed Analytics',
        description: 'Track clicks, referrers, locations, and more with real-time statistics.',
    },
    {
        icon: LinkIcon,
        title: 'Custom Links',
        description: 'Create branded, memorable links with custom slugs for your brand.',
    },
    {
        icon: Clock,
        title: 'Link Expiration',
        description: 'Set expiration dates for temporary campaigns and time-sensitive content.',
    },
    {
        icon: Eye,
        title: 'Privacy Controls',
        description: 'Control link visibility and manage who can access your shortened URLs.',
    },
    {
        icon: Shield,
        title: 'Secure & Reliable',
        description: 'Enterprise-grade security with 99.9% uptime guarantee.',
    },
];

type Feature = (typeof features)[number];

function FeatureCard({
    feature,
    index,
    scrollYProgress,
}: {
    feature: Feature;
    index: number;
    scrollYProgress: MotionValue<number>;
}) {
    const Icon = feature.icon;

    const rowIndex = Math.floor(index / 3);
    const y = useTransform(scrollYProgress, [0, 1], [rowIndex * 8, rowIndex * -16]);

    return (
        <motion.div
            style={{ y }}
            className="group p-8 rounded-2xl border border-border bg-card shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-primary/60"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
        >
            <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center bg-linear-to-br from-primary to-primary/70 shadow-sm transition-transform duration-300 group-hover:scale-110">
                <Icon className="h-6 w-6 text-primary-foreground" />
            </div>

            <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>

            <p className="text-muted-foreground">{feature.description}</p>
        </motion.div>
    );
}

export function Features() {
    const ref = useRef<HTMLDivElement | null>(null);

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start 80%', 'end 20%'],
    });

    return (
        <section className="py-24 px-4 bg-background">
            <div className="max-w-7xl mx-auto" ref={ref}>
                {/* HEADER */}
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
                        Everything you need to manage&nbsp;
                        <motion.span
                            initial={{ color: 'var(--foreground)' }}
                            whileInView={{ color: 'var(--primary)' }}
                            viewport={{ once: true, amount: 0.9 }}
                            transition={{ duration: 0.35, delay: 0.2, ease: 'easeOut' }}
                            className="relative"
                        >
                            links
                        </motion.span>
                    </h2>

                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Powerful features for individuals and teams to create, manage, and track short links.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <FeatureCard
                            key={feature.title}
                            feature={feature}
                            index={index}
                            scrollYProgress={scrollYProgress}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
