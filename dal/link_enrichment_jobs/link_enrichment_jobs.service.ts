import { isPrivateHost } from '@/lib/redirect_safety/redirect_probe';

export function isPrivateOrLocalhost(hostname: string): boolean {
    hostname = hostname.toLowerCase();

    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
        return true;
    }

    return isPrivateHost(hostname);
}
