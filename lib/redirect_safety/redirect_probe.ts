import ipaddr from 'ipaddr.js';
import { RedirectProbeResult } from '@/lib/redirect_safety/redirect_safety_types';

export function isPrivateHost(hostname: string): boolean {
    try {
        const addr = ipaddr.parse(hostname);
        return addr.range() !== 'unicast';
    } catch {
        return false;
    }
}

export async function probeRedirect(url: string): Promise<RedirectProbeResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
        const res = await fetch(url, {
            method: 'HEAD',
            redirect: 'manual',
            signal: controller.signal,
        });

        if (res.status >= 300 && res.status < 400 && res.headers.has('location')) {
            const location = res.headers.get('location')!;
            const target = new URL(location, url);

            return {
                kind: 'redirect',
                statusCode: res.status,
                targetUrl: target.toString(),
                targetHost: target.hostname,
            };
        }

        return { kind: 'no-redirect' };
    } finally {
        clearTimeout(timeout);
    }
}
