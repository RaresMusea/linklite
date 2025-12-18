import { describe, it, expect } from 'vitest';

import { isPlainObject, hasString, hasBoolean, hasNullableString, hasNullableOrUndefinedString } from '@/lib/guards';

describe('isPlainObject', () => {
    it('returns true for plain objects', () => {
        expect(isPlainObject({})).toBe(true);
        expect(isPlainObject({ a: 1 })).toBe(true);
        expect(isPlainObject(Object.create(null))).toBe(true); // e tot object & non-array
    });

    it('returns false for null', () => {
        expect(isPlainObject(null)).toBe(false);
    });

    it('returns false for arrays', () => {
        expect(isPlainObject([])).toBe(false);
        expect(isPlainObject([1, 2, 3])).toBe(false);
    });

    it('returns false for primitives', () => {
        expect(isPlainObject('x')).toBe(false);
        expect(isPlainObject(1)).toBe(false);
        expect(isPlainObject(true)).toBe(false);
        expect(isPlainObject(undefined)).toBe(false);
    });

    it('returns true for Date (note: Date is object and not array)', () => {
        // dacă vrei să fie false pentru Date, trebuie logică extra; testul reflectă implementarea actuală
        expect(isPlainObject(new Date())).toBe(true);
    });

    it('returns false for functions', () => {
        expect(isPlainObject(() => {})).toBe(false);
    });
});

describe('hasString', () => {
    it('returns true when key exists and value is string', () => {
        const x: Record<string, unknown> = { slug: 'abc' };
        expect(hasString(x, 'slug')).toBe(true);
    });

    it('returns false when key exists but value is not string', () => {
        const x: Record<string, unknown> = { slug: 123 };
        expect(hasString(x, 'slug')).toBe(false);
    });

    it('returns false when key does not exist', () => {
        const x: Record<string, unknown> = {};
        expect(hasString(x, 'slug')).toBe(false);
    });

    it('works with empty string (still string)', () => {
        const x: Record<string, unknown> = { slug: '' };
        expect(hasString(x, 'slug')).toBe(true);
    });
});

describe('hasBoolean', () => {
    it('returns true when key exists and value is boolean', () => {
        const x: Record<string, unknown> = { success: true };
        expect(hasBoolean(x, 'success')).toBe(true);
    });

    it('returns false when value is not boolean', () => {
        const x: Record<string, unknown> = { success: 'true' };
        expect(hasBoolean(x, 'success')).toBe(false);
    });

    it('returns false when key missing', () => {
        const x: Record<string, unknown> = {};
        expect(hasBoolean(x, 'success')).toBe(false);
    });
});

describe('hasNullableString', () => {
    it('returns true when value is null', () => {
        const x: Record<string, unknown> = { ownerId: null };
        expect(hasNullableString(x, 'ownerId')).toBe(true);
    });

    it('returns true when value is string', () => {
        const x: Record<string, unknown> = { ownerId: 'u1' };
        // dacă funcția ta are bug (compară direct cu 'string'), testul ăsta va pica — fix ca să-l prinzi
        expect(hasNullableString(x, 'ownerId')).toBe(true);
    });

    it('returns false when value is wrong type', () => {
        const x: Record<string, unknown> = { ownerId: 42 };
        expect(hasNullableString(x, 'ownerId')).toBe(false);
    });

    it('returns false when key missing (undefined is not allowed here)', () => {
        const x: Record<string, unknown> = {};
        expect(hasNullableString(x, 'ownerId')).toBe(false);
    });
});

describe('hasNullableOrUndefinedString', () => {
    it('returns true when value is null', () => {
        const x: Record<string, unknown> = { ownerId: null };
        expect(hasNullableOrUndefinedString(x, 'ownerId')).toBe(true);
    });

    it('returns true when value is string', () => {
        const x: Record<string, unknown> = { ownerId: 'u1' };
        expect(hasNullableOrUndefinedString(x, 'ownerId')).toBe(true);
    });

    it('returns true when key missing (undefined allowed)', () => {
        const x: Record<string, unknown> = {};
        expect(hasNullableOrUndefinedString(x, 'ownerId')).toBe(true);
    });

    it('returns true when value explicitly undefined', () => {
        const x: Record<string, unknown> = { ownerId: undefined };
        expect(hasNullableOrUndefinedString(x, 'ownerId')).toBe(true);
    });

    it('returns false when wrong type', () => {
        const x: Record<string, unknown> = { ownerId: 123 };
        expect(hasNullableOrUndefinedString(x, 'ownerId')).toBe(false);
    });
});
