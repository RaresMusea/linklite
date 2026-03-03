export function isFiniteNumber(input: unknown): boolean {
    return typeof input === 'number' && Number.isFinite(input);
}
