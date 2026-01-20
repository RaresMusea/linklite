import { getTld } from '@/lib/utils';

type RdapProvider = {
    baseUrl: string;
    buildPath: (hostname: string) => string;
};

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
