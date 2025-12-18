import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { isPlainObject } from '@/lib/guards';
import { ApiRouteResponse } from '@/lib/types';

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

export function isApiRouteResponseOf<T>(x: unknown, isData: (v: unknown) => v is T): x is ApiRouteResponse<T> {
    if (!isPlainObject(x)) return false;
    if (typeof x.success !== 'boolean') return false;

    if (x.success) return 'data' in x && isData(x.data);

    return 'error' in x && typeof x.error === 'string' && (x.status === undefined || typeof x.status === 'number');
}
