import { describe, expect, it } from 'vitest';
import { mapRedirectDataToRiskInput } from '@/dal/links/links.mapper';
import type { LinkRedirectData } from '@/dal/links/links.types';

describe('Link mapper tests', () => {
    const baseInput: LinkRedirectData = {
        slug: 'abc123',
        targetUrl: 'https://example.com/path',
        isShortener: false,
        redirectTargetUrl: null,
        redirectStatusCode: null,
        redirectCheckedAt: null,
        domain: null,
    };

    it('Maps top-level fields and null domain correctly', () => {
        const result = mapRedirectDataToRiskInput(baseInput);

        expect(result).toEqual({
            targetUrl: 'https://example.com/path',
            isShortener: false,
            hasRedirect: false,
            redirectStatusCode: undefined,
            domain: null,
        });
    });

    it('coerces isShortener and hasRedirect using Boolean semantics', () => {
        const resultWithNulls = mapRedirectDataToRiskInput({
            ...baseInput,
            isShortener: null,
            redirectTargetUrl: null,
        });

        expect(resultWithNulls.isShortener).toBe(false);
        expect(resultWithNulls.hasRedirect).toBe(false);

        const resultWithValues = mapRedirectDataToRiskInput({
            ...baseInput,
            isShortener: true,
            redirectTargetUrl: 'https://redirect.example.com',
        });

        expect(resultWithValues.isShortener).toBe(true);
        expect(resultWithValues.hasRedirect).toBe(true);
    });

    it('Maps redirectStatusCode null to undefined and preserves numeric values', () => {
        const withNull = mapRedirectDataToRiskInput({
            ...baseInput,
            redirectStatusCode: null,
        });
        expect(withNull.redirectStatusCode).toBeUndefined();

        const with302 = mapRedirectDataToRiskInput({
            ...baseInput,
            redirectStatusCode: 302,
        });
        expect(with302.redirectStatusCode).toBe(302);

        const withZero = mapRedirectDataToRiskInput({
            ...baseInput,
            redirectStatusCode: 0,
        });
        expect(withZero.redirectStatusCode).toBe(0);
    });

    it('Maps domain fields when domain exists', () => {
        const registeredAt = new Date('2020-01-01T00:00:00.000Z');
        const checkedAt = new Date('2024-01-01T00:00:00.000Z');

        const result = mapRedirectDataToRiskInput({
            ...baseInput,
            domain: {
                hostname: 'example.com',
                status: 'OK',
                registeredAt,
                checkedAt,
            },
        });

        expect(result.domain).toEqual({
            hostname: 'example.com',
            status: 'OK',
            registeredAt,
            checkedAt,
        });
    });

    it('passes through domain status string as-is (runtime cast only)', () => {
        const result = mapRedirectDataToRiskInput({
            ...baseInput,
            domain: {
                hostname: 'example.com',
                status: 'CUSTOM_STATUS',
                registeredAt: null,
                checkedAt: null,
            },
        });

        expect(result.domain).toEqual({
            hostname: 'example.com',
            status: 'CUSTOM_STATUS',
            registeredAt: null,
            checkedAt: null,
        });
    });
});
