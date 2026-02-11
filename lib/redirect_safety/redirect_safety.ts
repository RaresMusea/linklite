import { TRUSTED_DOMAINS } from '@/lib/redirect_safety/trusted_domains';

export function isAllowlisted(url: string): boolean {
    try {
        const hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();

        return [...TRUSTED_DOMAINS].some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`));
    } catch {
        return false;
    }
}
