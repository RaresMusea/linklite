
const MAX_BACKOFF_MIN = 60;

export function computeBackoffMinutes(attempts: number): number {
    const exp = Math.min(attempts, 10);

    return Math.min(MAX_BACKOFF_MIN, Math.max(1, 2 ** exp));
}
