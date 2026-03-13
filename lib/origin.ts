import { NextRequest } from 'next/server';

export function getOrigin(req: NextRequest): string | null {
    return getOriginFromHeaders(req.headers, req.nextUrl.protocol.replace(':', ''));
}

export function getAppOrigin() {
    const configured = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;

    if (!configured) return null;

    try {
        return new URL(configured).origin;
    } catch {
        return null;
    }
}

function getCloudflareScheme(headers: Headers): string | null {
    const cfVisitor = headers.get('cf-visitor');
    if (!cfVisitor) return null;

    try {
        const parsed = JSON.parse(cfVisitor);
        console.log('PARSED: ', parsed);
        return typeof parsed?.scheme === 'string' ? parsed.scheme : null;
    } catch {
        return null;
    }
}

export function getOriginFromHeaders(headers: Headers, fallbackProtocol: string): string | null {
    const cfScheme = getCloudflareScheme(headers);

    // Prefer Cloudflare client-facing scheme (important for tunnels)
    const xfProto = headers.get('x-forwarded-proto');
    const proto = (cfScheme ?? xfProto ?? fallbackProtocol).split(',')[0].trim().replace(/"/g, '');

    const host = (headers.get('x-forwarded-host') ?? headers.get('host'))?.split(',')[0].trim();

    return host ? `${proto}://${host}` : null;
}
