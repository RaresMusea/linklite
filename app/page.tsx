import { Hero } from '@/components/specific/landing/Hero';
import { Features } from '@/components/specific/landing/Features';

export default function Home() {
    return (
        <>
            <div className="bg-background text-foreground">
                <Hero />
                <section className="relative z-10">
                    <Features />
                </section>
            </div>
        </>
    );
}
