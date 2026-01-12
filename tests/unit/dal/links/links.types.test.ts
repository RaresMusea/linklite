import { describe, it, expect } from 'vitest';
import { isCreatedLink, isCreatedLinkResponse } from '@/dal/links/links.types';

describe('isCreatedLink', () => {
    it('returns false for non-plain objects', () => {
        expect(isCreatedLink(null)).toBe(false);
        expect(isCreatedLink('x')).toBe(false);
        expect(isCreatedLink(123)).toBe(false);
        expect(isCreatedLink([])).toBe(false);
    });

    it('returns true for valid CreatedLink with ownerId null', () => {
        const x = {
            id: 'id1',
            targetUrl: 'https://example.com',
            ownerId: null,
            slug: 'abc',
        };
        expect(isCreatedLink(x)).toBe(true);
    });

    it('returns true for valid CreatedLink with ownerId string', () => {
        const x = {
            id: 'id1',
            targetUrl: 'https://example.com',
            ownerId: 'u1',
            slug: 'abc',
        };
        expect(isCreatedLink(x)).toBe(true);
    });

    it('returns true when ownerId is missing (undefined allowed)', () => {
        const x = {
            id: 'id1',
            targetUrl: 'https://example.com',
            slug: 'abc',
        };
        expect(isCreatedLink(x)).toBe(true);
    });

    it('returns false when id is missing or not string', () => {
        expect(isCreatedLink({ targetUrl: 'https://example.com', ownerId: null })).toBe(false);
        expect(isCreatedLink({ id: 123, targetUrl: 'https://example.com', ownerId: null })).toBe(false);
    });

    it('returns false when targetUrl is missing or not string', () => {
        expect(isCreatedLink({ id: 'id1', ownerId: null })).toBe(false);
        expect(isCreatedLink({ id: 'id1', targetUrl: 123, ownerId: null })).toBe(false);
    });

    it('returns false when ownerId is wrong type', () => {
        expect(isCreatedLink({ id: 'id1', targetUrl: 'https://example.com', ownerId: 42 })).toBe(false);
        expect(isCreatedLink({ id: 'id1', targetUrl: 'https://example.com', ownerId: {} })).toBe(false);
    });

    it('NOTE: currently does NOT validate slug (missing slug still passes)', () => {
        const x = {
            id: 'id1',
            targetUrl: 'https://example.com',
            ownerId: null,
            // slug missing
        };
        expect(isCreatedLink(x)).toBe(true);
    });
});

describe('isCreatedLinkResponse', () => {
    it('returns false for non-plain objects', () => {
        expect(isCreatedLinkResponse(null)).toBe(false);
        expect(isCreatedLinkResponse('x')).toBe(false);
        expect(isCreatedLinkResponse(123)).toBe(false);
        expect(isCreatedLinkResponse([])).toBe(false);
    });

    it('returns true for valid response shape', () => {
        const x = {
            created: {
                id: 'id1',
                targetUrl: 'https://example.com',
                ownerId: null,
                slug: 'abc',
            },
            shortUrl: 'http://localhost:3000/abc',
        };

        expect(isCreatedLinkResponse(x)).toBe(true);
    });

    it('returns false when shortUrl missing or wrong type', () => {
        const base = {
            created: { id: 'id1', targetUrl: 'https://example.com', ownerId: null, slug: 'abc' },
        };

        expect(isCreatedLinkResponse(base)).toBe(false);
        expect(isCreatedLinkResponse({ ...base, shortUrl: 123 })).toBe(false);
    });

    it('returns false when created missing', () => {
        expect(isCreatedLinkResponse({ shortUrl: 'http://x' })).toBe(false);
    });

    it('returns false when created is invalid', () => {
        const x = {
            created: {
                id: 123, // invalid
                targetUrl: 'https://example.com',
                ownerId: null,
            },
            shortUrl: 'http://localhost:3000/abc',
        };

        expect(isCreatedLinkResponse(x)).toBe(false);
    });

    it('returns false when created is not an object', () => {
        expect(
            isCreatedLinkResponse({
                created: 'nope',
                shortUrl: 'http://localhost:3000/abc',
            })
        ).toBe(false);
    });
});
