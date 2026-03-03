import { isPlainObject } from '@/lib/guards';
import { isApiRouteResponseOf } from '@/lib/utils';
import { isCreatedLinkResponse } from '@/dal/links/links.types';
import { isFiniteNumber } from '@/lib/numeric_guards';

export async function shortenUrl(longUrl: string): Promise<string> {
    const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: longUrl }),
    });

    const json: unknown = await res.json();

    if (!res.ok || (isPlainObject(json) && json.success === false)) {
        if (isPlainObject(json) && typeof json.error === 'string') {
            const apiError = new Error(json.error) as Error & {
                code?: string;
                retryAfterSec?: number;
            };
            if (typeof json.code === 'string') {
                apiError.code = json.code;
            }
            const retryAfter = Number(
                typeof res.headers?.get === 'function' ? res.headers.get('Retry-After') : undefined
            );

            if (isFiniteNumber(retryAfter) && retryAfter > 0) {
                apiError.retryAfterSec = retryAfter;
            }
            throw apiError;
        }
        throw new Error('Failed to shorten URL. Please try again.');
    }

    if (!isApiRouteResponseOf(json, isCreatedLinkResponse)) {
        throw new Error('Unexpected response from server.');
    }

    if (!json.success) {
        throw new Error(json.error || 'Failed to shorten URL. Please try again.');
    }

    return json.data.shortUrl;
}