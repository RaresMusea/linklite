import { useEffect, useRef, useState } from 'react';

export function useMinDurationSpinner(minMs = 230) {
    const [visible, setVisible] = useState(false);
    const shownAtRef = useRef<number | null>(null);
    const timerRef = useRef<number | null>(null);

    const show = () => {
        shownAtRef.current = Date.now();
        setVisible(true);
    };

    const hide = () => {
        const elapsed = Date.now() - (shownAtRef.current ?? Date.now());
        const delay = Math.max(0, minMs - elapsed);
        timerRef.current = window.setTimeout(() => setVisible(false), delay);
    };

    useEffect(
        () => () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        },
        []
    );

    return { spinnerVisible: visible, showSpinner: show, hideSpinner: hide };
}
