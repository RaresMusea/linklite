import type { ReactNode } from 'react';
import { Header } from '@/components/specific/landing/Header';
import { Footer } from '@/components/shared/footer/Footer';
import { RouteTransition } from '@/components/shared/layout/RouteTransition';

export default function MainLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <div className="flex-1">
                <RouteTransition>{children}</RouteTransition>
            </div>
            <Footer />
        </div>
    );
}
