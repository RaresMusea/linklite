import { NextRequest } from 'next/server';

export function getOrigin(req: NextRequest): string | null {
    return getOriginFromHeaders(req.headers, req.nextUrl.protocol.replace(':', ''));
}

export function getOriginFromHeaders(headers: Headers, fallbackProtocol: string): string | null {
    const proto = headers.get('x-forwarded-proto') ?? fallbackProtocol;
    const host = headers.get('x-forwarded-host') ?? headers.get('host');
    return host ? `${proto}://${host}` : null;
}
