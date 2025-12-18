import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { isPlainObject } from '@/lib/guards';
import { ApiEnvelope } from '@/lib/types';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function generateSlug(length = 6): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let slug: string = '';

    for (let i = 0; i < length; i++) {
        slug += chars[Math.floor(Math.random() * chars.length)];
    }

    return slug;
}

export function isApiEnvelopeOf<T>(x: unknown, isData: (v: unknown) => v is T): x is ApiEnvelope<T> {
    if (!isPlainObject(x)) return false;
    if (!('data' in x) || !isPlainObject(x.data)) return false;

    const inner = x.data as Record<string, unknown>;
    if (typeof inner.success !== 'boolean') return false;

    if (inner.success) {
        return 'data' in inner && isData(inner.data);
    }

    return (
        'error' in inner &&
        typeof inner.error === 'string' &&
        (inner.status === undefined || typeof inner.status === 'number')
    );
}

export type ApiRouteResponse<T> = { success: true; data: T } | { success: false; error: string; status?: number };

export function isApiRouteResponseOf<T>(x: unknown, isData: (v: unknown) => v is T): x is ApiRouteResponse<T> {
    if (!isPlainObject(x)) return false;
    if (typeof x.success !== 'boolean') return false;

    if (x.success) return 'data' in x && isData(x.data);

    return 'error' in x && typeof x.error === 'string' && (x.status === undefined || typeof x.status === 'number');
}

export function isApiRouteError(x: unknown): x is { success: false; error: string; status?: number } {
    if (!isPlainObject(x)) return false;
    return (
        x.success === false && typeof x.error === 'string' && (x.status === undefined || typeof x.status === 'number')
    );
}
