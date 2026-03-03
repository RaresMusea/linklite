import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { isFiniteNumber } from '@/lib/numeric_guards';

export function useRateLimit() {
    const [rateLimitResetAtMs, setRateLimitResetAtMs] = useState<number | null>(null);
    const [rateLimitRemainingSec, setRateLimitRemainingSec] = useState<number>(0);

    const RATE_LIMIT_TOAST_ID = 'rate-limit-reached';

    useEffect(() => {
        if (rateLimitResetAtMs === null) return;
        const timer = window.setInterval(() => {
            const next = Math.max(0, Math.ceil((rateLimitResetAtMs - Date.now()) / 1000));
            setRateLimitRemainingSec(next);
            if (next <= 0) {
                toast.dismiss(RATE_LIMIT_TOAST_ID);
                setRateLimitResetAtMs(null);
            }
        }, 1000);
        return () => window.clearInterval(timer);
    }, [rateLimitResetAtMs]);

    const startCooldown = (retryAfterSec?: number) => {
        const retryAfter = Number(retryAfterSec);

        if (!isFiniteNumber(retryAfter) || retryAfter <= 0) {
            return;
        }

        const nextResetAt = Date.now() + retryAfter * 1000;
        const effectiveResetAt = rateLimitResetAtMs === null ? nextResetAt : Math.max(rateLimitResetAtMs, nextResetAt);
        const remaining = Math.max(1, Math.ceil((effectiveResetAt - Date.now()) / 1000));
        setRateLimitResetAtMs(effectiveResetAt);
        setRateLimitRemainingSec(remaining);
    };

    return { rateLimitRemainingSec, isRateLimited: rateLimitRemainingSec > 0, startCooldown };
}
