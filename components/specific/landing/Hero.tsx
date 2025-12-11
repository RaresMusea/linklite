import { Zap } from 'lucide-react';
import LinkShortener from '@/components/specific/link-shortener/LinkShortener';

export function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-background to-primary/20" />
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/30 rounded-full mix-blend-multiply blur-3xl opacity-40 animate-blob" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/40 rounded-full mix-blend-multiply blur-3xl opacity-30 animate-blob animation-delay-2000" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/20 rounded-full mix-blend-multiply blur-3xl opacity-30 animate-blob animation-delay-4000" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8 bg-primary/10 text-primary animate-fade-in">
                    <Zap className="h-4 w-4" />
                    Lightning-fast link shortening
                </div>

                <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up">
                    <span className="text-foreground">Shorten Your Links.</span>
                    <br />
                    <span className="bg-linear-to-r from-primary to-primary/70 text-transparent bg-clip-text">
                        Track Everything.
                    </span>
                </h1>

                <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-full mx-auto animate-slide-up animation-delay-200">
                    Create short, memorable links in seconds. Track clicks, analyze performance, and manage everything
                    from one beautiful dashboard.
                </p>

                <div className="animate-slide-up animation-delay-400">
                    <LinkShortener />
                </div>

                {/*<p className="mt-8 text-sm text-muted-foreground animate-fade-in animation-delay-600">*/}
                {/*    No registration required for basic shortening.*/}
                {/*    <button*/}
                {/*        className="text-primary hover:text-primary/80 font-medium ml-1 transition-colors"*/}
                {/*    >*/}
                {/*        Sign up*/}
                {/*    </button>{" "}*/}
                {/*    for advanced features.*/}
                {/*</p>*/}
            </div>
        </section>
    );
}
