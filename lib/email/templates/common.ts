export function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

// TODO: Update with the actual linklite.png once deploying to preprod
export function getBrandLogoUrl(sourceUrl: string): string {
    const explicitAssetBaseUrl = process.env.EMAIL_ASSETS_BASE_URL;
    if (explicitAssetBaseUrl) {
        return `${explicitAssetBaseUrl.replace(/\/$/, '')}/linklite.png`;
    }

    try {
        const source = new URL(sourceUrl);
        if (isPublicHostname(source.hostname)) {
            return `${source.origin}/apple-touch-icon.png`;
        }
    } catch {
        // noop
    }

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appBaseUrl) {
        try {
            const appBase = new URL(appBaseUrl);
            if (isPublicHostname(appBase.hostname)) {
                return `${appBase.origin}/apple-touch-icon.png`;
            }
        } catch {
            // noop
        }
    }

    return 'https://preprod.linklite.dev/apple-touch-icon.png';
}

function isPublicHostname(hostname: string): boolean {
    const host = hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return false;
    if (host.startsWith('10.')) return false;
    if (host.startsWith('192.168.')) return false;

    if (host.startsWith('172.')) {
        const octets = host.split('.');
        const second = Number(octets[1]);
        if (Number.isInteger(second) && second >= 16 && second <= 31) return false;
    }

    return true;
}
