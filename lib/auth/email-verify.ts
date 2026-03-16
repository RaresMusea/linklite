import { getAppOrigin } from '@/lib/origin';
import { logger } from '@/lib/logging/logger';

export type VerifyEmailStatus = 'success' | 'expired' | 'invalid';

const emailVerifyLogger = logger
    .component('worker.domain_enrichment')
    .child(undefined, ['worker', 'domain-enrichment']);

export async function verifyEmailToken(token?: string): Promise<VerifyEmailStatus> {
    if (!token) return 'invalid';

    emailVerifyLogger.info(`Verifying email for token`, { token });

    const origin = getAppOrigin();
    if (!origin) return 'invalid';

    const verifyUrl = new URL('/api/auth/verify-email', origin);
    verifyUrl.searchParams.set('token', token);

    try {
        const response = await fetch(verifyUrl.toString(), {
            method: 'GET',
            headers: { accept: 'application/json' },
            cache: 'no-store',
        });

        if (response.ok) {
            emailVerifyLogger.info(`Email verified successfully`, { token });
            return 'success';
        }

        const errorPayload = (await response.json().catch(() => null)) as { code?: string } | null;

        if (errorPayload?.code === 'TOKEN_EXPIRED') return 'expired';

        return 'invalid';
    } catch (error) {
        emailVerifyLogger.error(`Failed to verify email`, {
            token,
            details: error instanceof Error ? error.message : '',
        });
        return 'invalid';
    }
}
