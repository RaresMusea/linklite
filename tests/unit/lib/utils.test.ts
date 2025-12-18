import { describe, it, expect } from 'vitest';
import { cn, generateSlug, isApiRouteResponseOf } from '@/lib/utils';

function isNumber(x: unknown): x is number {
    return typeof x === 'number';
}

describe('cn', () => {
    it('merges class names', () => {
        expect(cn('a', 'b')).toBe('a b');
    });

    it('filters falsy values like clsx', () => {
        expect(cn('a', false, null, undefined, '', 'c')).toBe('a c');
    });

    it('merges Tailwind conflicting classes (twMerge)', () => {
        expect(cn('p-2', 'p-4')).toBe('p-4');
        expect(cn('text-sm', 'text-lg')).toBe('text-lg');
    });

    it('handles arrays and objects (clsx behavior)', () => {
        expect(cn(['a', 'b'], { c: true, d: false })).toBe('a b c');
    });
});

describe('generateSlug', () => {
    it('returns a string with default length 6', () => {
        const s = generateSlug();
        expect(typeof s).toBe('string');
        expect(s).toHaveLength(6);
    });

    it('returns a string with requested length', () => {
        const s = generateSlug(10);
        expect(s).toHaveLength(10);
    });

    it('contains only allowed characters', () => {
        const allowed = /^[a-zA-Z0-9]+$/;

        for (let i = 0; i < 50; i++) {
            const s = generateSlug(12);
            expect(s).toMatch(allowed);
        }
    });

    it('returns empty string for length 0', () => {
        expect(generateSlug(0)).toBe('');
    });
});

describe('isApiRouteResponseOf', () => {
    it('returns false for non-objects', () => {
        expect(isApiRouteResponseOf('x', isNumber)).toBe(false);
        expect(isApiRouteResponseOf(123, isNumber)).toBe(false);
        expect(isApiRouteResponseOf(null, isNumber)).toBe(false);
        expect(isApiRouteResponseOf([], isNumber)).toBe(false);
    });

    it('returns false when success is missing or not boolean', () => {
        expect(isApiRouteResponseOf({}, isNumber)).toBe(false);
        expect(isApiRouteResponseOf({ success: 'true' }, isNumber)).toBe(false);
    });

    it('validates success response: success=true and data matches guard', () => {
        const x: unknown = { success: true, data: 42 };
        expect(isApiRouteResponseOf(x, isNumber)).toBe(true);

        if (isApiRouteResponseOf(x, isNumber) && x.success) {
            expect(x.data).toBe(42);
        }
    });

    it('returns false for success response when data does not match guard', () => {
        const x: unknown = { success: true, data: 'nope' };
        expect(isApiRouteResponseOf(x, isNumber)).toBe(false);
    });

    it('validates error response: success=false and error is string', () => {
        const x: unknown = { success: false, error: 'bad', status: 400 };
        expect(isApiRouteResponseOf(x, isNumber)).toBe(true);

        if (isApiRouteResponseOf(x, isNumber) && !x.success) {
            expect(x.error).toBe('bad');
            expect(x.status).toBe(400);
        }
    });

    it('accepts error response without status', () => {
        const x: unknown = { success: false, error: 'bad' };
        expect(isApiRouteResponseOf(x, isNumber)).toBe(true);
    });

    it('rejects error response when status is wrong type', () => {
        const x: unknown = { success: false, error: 'bad', status: '400' };
        expect(isApiRouteResponseOf(x, isNumber)).toBe(false);
    });

    it('rejects error response when error is missing or not string', () => {
        expect(isApiRouteResponseOf({ success: false }, isNumber)).toBe(false);
        expect(isApiRouteResponseOf({ success: false, error: 123 }, isNumber)).toBe(false);
    });
});
