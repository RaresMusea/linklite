import { stagger, Variants } from 'framer-motion';

export const containerVariants: Variants = {
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

export const listVariants: Variants = {
    hidden: { opacity: 0, y: 8 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            delayChildren: stagger(0.05),
        },
    },
};

export const listItemVariants: Variants = {
    hidden: { opacity: 0, y: 4 },
    show: { opacity: 1, y: 0 },
};

export const sectionVariants: Variants = {
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
