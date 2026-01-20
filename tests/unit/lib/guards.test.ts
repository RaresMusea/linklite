import { describe, it, expect } from 'vitest';

import {
    isPlainObject,
    hasString,
    hasBoolean,
    hasNullableString,
    hasNullableOrUndefinedString,
    hasArray,
    hasNullableOrUndefinedArray,
    hasNullableArray,
} from '@/lib/guards';

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

describe('hasArray', () => {
    it('returns true when key exists and value is array', () => {
        const x: Record<string, unknown> = { items: [] };
        expect(hasArray(x, 'items')).toBe(true);

        const y: Record<string, unknown> = { items: [1, 2, 3] };
        expect(hasArray(y, 'items')).toBe(true);

        const z: Record<string, unknown> = { items: ['a', 'b', 'c'] };
        expect(hasArray(z, 'items')).toBe(true);
    });

    it('returns false when key exists but value is not array', () => {
        const x: Record<string, unknown> = { items: 'not an array' };
        expect(hasArray(x, 'items')).toBe(false);

        const y: Record<string, unknown> = { items: 123 };
        expect(hasArray(y, 'items')).toBe(false);

        const z: Record<string, unknown> = { items: null };
        expect(hasArray(z, 'items')).toBe(false);

        const w: Record<string, unknown> = { items: {} };
        expect(hasArray(w, 'items')).toBe(false);

        const v: Record<string, unknown> = { items: undefined };
        expect(hasArray(v, 'items')).toBe(false);
    });

    it('returns false when key does not exist', () => {
        const x: Record<string, unknown> = {};
        expect(hasArray(x, 'items')).toBe(false);
    });

    it('handles nested arrays correctly', () => {
        const x: Record<string, unknown> = {
            items: [
                [1, 2],
                [3, 4],
            ],
        };
        expect(hasArray(x, 'items')).toBe(true);

        const y: Record<string, unknown> = { items: [{ id: 1 }, { id: 2 }] };
        expect(hasArray(y, 'items')).toBe(true);
    });
});

describe('hasNullableArray', () => {
    it('returns true when value is null', () => {
        const x: Record<string, unknown> = { items: null };
        expect(hasNullableArray(x, 'items')).toBe(true);
    });

    it('returns true when value is array', () => {
        const x: Record<string, unknown> = { items: [] };
        expect(hasNullableArray(x, 'items')).toBe(true);

        const y: Record<string, unknown> = { items: [1, 2, 3] };
        expect(hasNullableArray(y, 'items')).toBe(true);
    });

    it('returns false when value is not array and not null', () => {
        const x: Record<string, unknown> = { items: 'string' };
        expect(hasNullableArray(x, 'items')).toBe(false);

        const y: Record<string, unknown> = { items: 123 };
        expect(hasNullableArray(y, 'items')).toBe(false);

        const z: Record<string, unknown> = { items: {} };
        expect(hasNullableArray(z, 'items')).toBe(false);
    });

    it('returns false when key missing (undefined is not allowed)', () => {
        const x: Record<string, unknown> = {};
        expect(hasNullableArray(x, 'items')).toBe(false);

        const y: Record<string, unknown> = { items: undefined };
        expect(hasNullableArray(y, 'items')).toBe(false);
    });

    it('returns false for other falsy values that are not null', () => {
        const x: Record<string, unknown> = { items: 0 };
        expect(hasNullableArray(x, 'items')).toBe(false);

        const y: Record<string, unknown> = { items: false };
        expect(hasNullableArray(y, 'items')).toBe(false);

        const z: Record<string, unknown> = { items: '' };
        expect(hasNullableArray(z, 'items')).toBe(false);
    });
});

describe('hasNullableOrUndefinedArray', () => {
    it('returns true when value is null', () => {
        const x: Record<string, unknown> = { items: null };
        expect(hasNullableOrUndefinedArray(x, 'items')).toBe(true);
    });

    it('returns true when value is array', () => {
        const x: Record<string, unknown> = { items: [] };
        expect(hasNullableOrUndefinedArray(x, 'items')).toBe(true);

        const y: Record<string, unknown> = { items: ['a', 'b'] };
        expect(hasNullableOrUndefinedArray(y, 'items')).toBe(true);
    });

    it('returns true when key missing (undefined allowed)', () => {
        const x: Record<string, unknown> = {};
        expect(hasNullableOrUndefinedArray(x, 'items')).toBe(true);
    });

    it('returns true when value explicitly undefined', () => {
        const x: Record<string, unknown> = { items: undefined };
        expect(hasNullableOrUndefinedArray(x, 'items')).toBe(true);
    });

    it('returns false when wrong type (not array, null, or undefined)', () => {
        const x: Record<string, unknown> = { items: 'string' };
        expect(hasNullableOrUndefinedArray(x, 'items')).toBe(false);

        const y: Record<string, unknown> = { items: 123 };
        expect(hasNullableOrUndefinedArray(y, 'items')).toBe(false);

        const z: Record<string, unknown> = { items: {} };
        expect(hasNullableOrUndefinedArray(z, 'items')).toBe(false);

        const w: Record<string, unknown> = { items: true };
        expect(hasNullableOrUndefinedArray(w, 'items')).toBe(false);
    });

    it('handles edge cases correctly', () => {
        // Empty string
        const x: Record<string, unknown> = { items: '' };
        expect(hasNullableOrUndefinedArray(x, 'items')).toBe(false);

        // Zero
        const y: Record<string, unknown> = { items: 0 };
        expect(hasNullableOrUndefinedArray(y, 'items')).toBe(false);

        // False
        const z: Record<string, unknown> = { items: false };
        expect(hasNullableOrUndefinedArray(z, 'items')).toBe(false);
    });
});

describe('Type guard behavior', () => {
    it('hasString provides type narrowing', () => {
        const obj: Record<string, unknown> = { name: 'John', age: 30 };

        if (hasString(obj, 'name')) {
            const name: string = obj.name;
            expect(typeof name).toBe('string');
        }
    });

    it('hasBoolean provides type narrowing', () => {
        const obj: Record<string, unknown> = { active: true, count: 5 };

        if (hasBoolean(obj, 'active')) {
            const active: boolean = obj.active;
            expect(typeof active).toBe('boolean');
        }
    });

    it('hasArray provides type narrowing', () => {
        const obj: Record<string, unknown> = { tags: ['js', 'ts'], count: 2 };

        if (hasArray(obj, 'tags')) {
            const tags: unknown[] = obj.tags;
            expect(Array.isArray(tags)).toBe(true);
        }
    });

    it('functions without type guard return boolean (no narrowing)', () => {
        const obj: Record<string, unknown> = { data: null };

        const result: boolean = hasNullableString(obj, 'data');
        expect(typeof result).toBe('boolean');
    });
});
