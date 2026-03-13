import { describe, it, expect } from 'vitest';
import { getAppOrigin, getOriginFromHeaders } from '@/lib/origin';

describe('getOriginFromHeaders', () => {
    it('uses x-forwarded headers when present', () => {
        const headers = new Headers({
            'x-forwarded-proto': 'https',
            'x-forwarded-host': 'staging.linklite.dev',
        });

        expect(getOriginFromHeaders(headers, 'http')).toBe('https://staging.linklite.dev');
    });

    it('falls back to host header', () => {
        const headers = new Headers({
            host: 'localhost:3000',
        });

        expect(getOriginFromHeaders(headers, 'http')).toBe('http://localhost:3000');
    });

    it('returns null when no host is present', () => {
        const headers = new Headers();

        expect(getOriginFromHeaders(headers, 'http')).toBeNull();
    });
});

describe('getAppOrigin', () => {
    it('prefers BETTER_AUTH_URL over NEXT_PUBLIC_APP_URL', () => {
        const originalBetterAuthUrl = process.env.BETTER_AUTH_URL;
        const originalPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;

        try {
            process.env.BETTER_AUTH_URL = 'https://auth.linklite.dev/api/auth';
            process.env.NEXT_PUBLIC_APP_URL = 'https://public.linklite.dev/some/path';

            expect(getAppOrigin()).toBe('https://auth.linklite.dev');
        } finally {
            if (originalBetterAuthUrl === undefined) {
                delete process.env.BETTER_AUTH_URL;
            } else {
                process.env.BETTER_AUTH_URL = originalBetterAuthUrl;
            }

            if (originalPublicAppUrl === undefined) {
                delete process.env.NEXT_PUBLIC_APP_URL;
            } else {
                process.env.NEXT_PUBLIC_APP_URL = originalPublicAppUrl;
            }
        }
    });

    it('uses NEXT_PUBLIC_APP_URL when BETTER_AUTH_URL is missing', () => {
        const originalBetterAuthUrl = process.env.BETTER_AUTH_URL;
        const originalPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;

        try {
            delete process.env.BETTER_AUTH_URL;
            process.env.NEXT_PUBLIC_APP_URL = 'https://public.linklite.dev/welcome';

            expect(getAppOrigin()).toBe('https://public.linklite.dev');
        } finally {
            if (originalBetterAuthUrl === undefined) {
                delete process.env.BETTER_AUTH_URL;
            } else {
                process.env.BETTER_AUTH_URL = originalBetterAuthUrl;
            }

            if (originalPublicAppUrl === undefined) {
                delete process.env.NEXT_PUBLIC_APP_URL;
            } else {
                process.env.NEXT_PUBLIC_APP_URL = originalPublicAppUrl;
            }
        }
    });

    it('returns null when configured URL is invalid', () => {
        const originalBetterAuthUrl = process.env.BETTER_AUTH_URL;
        const originalPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;

        try {
            process.env.BETTER_AUTH_URL = '::not-a-url::';
            process.env.NEXT_PUBLIC_APP_URL = 'https://public.linklite.dev';

            expect(getAppOrigin()).toBeNull();
        } finally {
            if (originalBetterAuthUrl === undefined) {
                delete process.env.BETTER_AUTH_URL;
            } else {
                process.env.BETTER_AUTH_URL = originalBetterAuthUrl;
            }

            if (originalPublicAppUrl === undefined) {
                delete process.env.NEXT_PUBLIC_APP_URL;
            } else {
                process.env.NEXT_PUBLIC_APP_URL = originalPublicAppUrl;
            }
        }
    });

    it('returns null when no origin source is configured', () => {
        const originalBetterAuthUrl = process.env.BETTER_AUTH_URL;
        const originalPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;

        try {
            delete process.env.BETTER_AUTH_URL;
            delete process.env.NEXT_PUBLIC_APP_URL;

            expect(getAppOrigin()).toBeNull();
        } finally {
            if (originalBetterAuthUrl === undefined) {
                delete process.env.BETTER_AUTH_URL;
            } else {
                process.env.BETTER_AUTH_URL = originalBetterAuthUrl;
            }

            if (originalPublicAppUrl === undefined) {
                delete process.env.NEXT_PUBLIC_APP_URL;
            } else {
                process.env.NEXT_PUBLIC_APP_URL = originalPublicAppUrl;
            }
        }
    });
});
