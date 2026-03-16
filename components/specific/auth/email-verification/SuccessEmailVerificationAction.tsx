'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Link2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const REDIRECT_SECONDS = 6;

export function SuccessRedirectActions() {
    const router = useRouter();
    const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setSecondsLeft((current) => (current > 0 ? current - 1 : 0));
        }, 1000);

        const timeoutId = window.setTimeout(() => {
            router.replace('/signin');
        }, REDIRECT_SECONDS * 1000);

        return () => {
            window.clearInterval(intervalId);
            window.clearTimeout(timeoutId);
        };
    }, [router]);

    return (
        <div className="space-y-2">
            <p className="text-center text-sm text-muted-foreground" aria-live="polite">
                You will be redirected to sign in in {secondsLeft} second{secondsLeft === 1 ? '' : 's'}.
            </p>
            <Button asChild size="lg" className="w-full">
                <Link href="/signin">
                    Sign in to your account
                    <Link2 className="h-4 w-4" />
                </Link>
            </Button>
        </div>
    );
}
