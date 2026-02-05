import { RedirectProbeResult } from '@/lib/redirect_safety/redirect_safety_types';
import { getRegistrableDomain } from '@/lib/utils';
import { KNOWN_SHORTENER_HOSTNAMES } from '@/lib/redirect_safety/trusted_shorteners';

export function inferIsShortener(originalHost: string, probe: RedirectProbeResult): boolean {
    const originalDomain = getRegistrableDomain(originalHost);
    if (!originalDomain) return false;

    if (KNOWN_SHORTENER_HOSTNAMES.includes(originalDomain)) return true;

    if (probe.kind !== 'redirect') return false;

    const targetDomain = getRegistrableDomain(probe.targetHost);
    if (!targetDomain) return false;

    return targetDomain !== originalDomain;
}
