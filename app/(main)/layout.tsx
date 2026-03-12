import type { ReactNode } from 'react';
import { Header } from '@/components/specific/landing/Header';
import { Footer } from '@/components/shared/footer/Footer';
import { RouteTransition } from '@/components/shared/layout/RouteTransition';

export default function MainLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <Header />
            <RouteTransition>{children}</RouteTransition>
            <Footer />
        </>
    );
}
