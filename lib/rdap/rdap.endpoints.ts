import { getTld } from '@/lib/utils';
import { asRdapEvents, FetchRdapInfoResponse, RdapProvider } from '@/lib/rdap/rdap.types';

const RDAP_PROVIDERS: Record<string, RdapProvider> = {
    com: { baseUrl: 'https://rdap.verisign.com', buildPath: (d) => `/com/v1/domain/${encodeURIComponent(d)}` },
    net: { baseUrl: 'https://rdap.verisign.com', buildPath: (d) => `/net/v1/domain/${encodeURIComponent(d)}` },

    // PIR
    org: {
        baseUrl: 'https://rdap.publicinterestregistry.org',
        buildPath: (d) => `/rdap/domain/${encodeURIComponent(d)}`,
    },

    dev: { baseUrl: 'https://rdap.registry.google', buildPath: (d) => `/rdap/domain/${encodeURIComponent(d)}` },

    // ccTLD examples
    ro: { baseUrl: 'https://rdap.rotld.ro', buildPath: (d) => `/rdap/domain/${encodeURIComponent(d)}` },
    in: { baseUrl: 'https://rdap.registry.in', buildPath: (d) => `/rdap/domain/${encodeURIComponent(d)}` },
    cn: { baseUrl: 'https://rdap.conac.cn', buildPath: (d) => `/rdap/domain/${encodeURIComponent(d)}` },

    uk: { baseUrl: 'https://rdap.nominet.uk', buildPath: (d) => `/domain/${encodeURIComponent(d)}` },
};

const UNSUPPORTED_DOMAINS = ['gov', 'mil', 'edu'];

export function getRdapUrl(domain: string): string | null {
    const tld = getTld(domain);
    if (!tld) return null;

    if (UNSUPPORTED_DOMAINS.includes(tld)) return null;

    const provider = RDAP_PROVIDERS[tld];
    if (!provider) return null;

    return `${provider.baseUrl}${provider.buildPath(domain)}`;
}

export function extractRegistrationDate(rdapJson: unknown): Date | null {
    const events = asRdapEvents(rdapJson);
    if (!events) return null;

    const reg = events.find(
        (e) =>
            String(e.eventAction ?? '')
                .toLowerCase()
                .trim() === 'registration'
    );
    if (!reg) return null;

    const dateStr = reg.eventDate;

    if (typeof dateStr !== 'string' || !dateStr) return null;

    const d = new Date(dateStr);
    return Number.isFinite(d.getTime()) ? d : null;
}

export async function fetchRdapJson(url: string, timeoutMs = 8000): Promise<FetchRdapInfoResponse> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { accept: 'application/rdap+json, application/json' },
        });

        if (!res.ok) return { ok: false, status: res.status };

        const json = await res.json();
        return { ok: true, status: res.status, json };
    } catch {
        return { ok: false, status: 0 };
    } finally {
        clearTimeout(t);
    }
}
