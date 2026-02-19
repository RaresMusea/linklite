import { useEffect, useRef, useState } from 'react';

type Phase = 'skeleton' | 'card' | 'progress' | 'ready';

export function useRedirectPhase(
    autoDelayMs: number,
    targetUrl: string,
    autoEnabled: boolean,
    countdownPaused = false
) {

    const [phase, setPhase] = useState<Phase>('skeleton');
    const [progress, setProgress] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
    const elapsedMsRef = useRef(0);

    useEffect(() => {
        let cancelled = false;
        const timeouts: number[] = [];

        const t1 = window.setTimeout(() => {
            if (cancelled) return;
            setPhase('card');
        }, 150);
        timeouts.push(t1);

        const t2 = window.setTimeout(() => {
            if (cancelled) return;
            setPhase('progress');
        }, 600);
        timeouts.push(t2);

        return () => {
            cancelled = true;
            timeouts.forEach((t) => clearTimeout(t));
        };
    }, []);

    // 2. Progress + countdown
    useEffect(() => {
        if (phase !== 'progress') return;
        if (countdownPaused) return;

        const duration = autoDelayMs > 0 ? autoDelayMs : 1200;
        const elapsedBeforeStart = Math.min(elapsedMsRef.current, duration);
        const start = performance.now() - elapsedBeforeStart;

        let raf = 0;
        const tick = (now: number) => {
            const elapsed = now - start;
            elapsedMsRef.current = elapsed;
            const p = Math.min((elapsed / duration) * 100, 100);
            setProgress(p);

            if (autoDelayMs > 0) {
                const remainingMs = Math.max(duration - elapsed, 0);
                setSecondsLeft(Math.ceil(remainingMs / 1000));
            } else {
                setSecondsLeft(null);
            }

            if (p >= 100) {
                setProgress(100);
                if (autoDelayMs > 0) setSecondsLeft(0);
                setPhase('ready');
                return;
            }
            raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [phase, autoDelayMs, countdownPaused]);

    // 3. Auto redirect
    useEffect(() => {
        if (phase !== 'ready') return;
        if (!autoEnabled) return;
        if (!targetUrl) return;

        const t = window.setTimeout(() => {
            try {
                window.location.assign(targetUrl);
            } catch {
                window.location.href = targetUrl;
            }
        }, 0);

        return () => clearTimeout(t);
    }, [phase, autoEnabled, targetUrl]);

    return { phase, progress, secondsLeft };
}
