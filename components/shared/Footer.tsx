import Link from 'next/link';

export function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-border mt-8">
            <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-muted-foreground">
                <p className="text-center sm:text-left">
                    © {year}{' '}
                    <span className="font-semibold">
                        Link<span className="text-primary">Lite</span>
                    </span>
                    . All rights reserved.
                </p>

                <div className="flex items-center gap-4">
                    <Link href="/terms" className="hover:text-foreground transition-colors">
                        Terms &amp; Conditions
                    </Link>
                    <Link href="#" className="hover:text-foreground transition-colors">
                        Privacy Policy
                    </Link>
                </div>
            </div>
        </footer>
    );
}