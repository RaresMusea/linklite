import ipaddr from 'ipaddr.js';

export function isPrivateHost(hostname: string): boolean {
    try {
        const addr = ipaddr.parse(hostname);
        return addr.range() !== 'unicast';
    } catch {
        return false;
    }
}
