import { Hero } from '@/components/specific/landing/Hero';

export default function Home() {
    return (
        <>
            <div className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden bg-background text-foreground">
                <Hero />
            </div>
        </>
    );
}
