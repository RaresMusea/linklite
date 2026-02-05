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
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return { kind: 'no-redirect' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
        const tryOnce = async (method: 'HEAD' | 'GET') => {
            const res = await fetch(parsed.toString(), {
                method,
                redirect: 'manual',
                signal: controller.signal,
                headers: {
                    // helps with some CDNs
                    'user-agent': 'linklite-enrichment-worker/1.0',
                    accept: '*/*',
                },
            });

            if (res.status >= 300 && res.status < 400 && res.headers.has('location')) {
                const location = res.headers.get('location')!;
                const target = new URL(location, parsed);

                return {
                    kind: 'redirect' as const,
                    statusCode: res.status,
                    targetUrl: target.toString(),
                    targetHost: target.hostname,
                };
            }

            return null;
        };

        const head = await tryOnce('HEAD');
        if (head) return head;

        const get = await tryOnce('GET');
        if (get) return get;

        return { kind: 'no-redirect' };
    } finally {
        clearTimeout(timeout);
    }
}
