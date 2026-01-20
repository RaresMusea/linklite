export function extractErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;

    if (typeof err === 'string') return err;

    return 'WHOIS failed';
}

export function extractErrorCode(err: unknown): number | undefined {
    if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        typeof (err as { code: unknown }).code === 'number'
    ) {
        return (err as { code: number }).code;
    }

    return undefined;
}
