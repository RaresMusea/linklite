export function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

export function getEmailFooterText(): string[] {
    return ['', 'Need help? Contact support@linklite.dev', 'Security issues: security@linklite.dev', '', '© LinkLite 2026'];
}

export function getEmailFooterHtml(): string {
    return `
      <hr style="border:0;border-top:1px solid #ececf1;margin:20px 0 14px 0;" />
      <p style="margin:0 0 6px 0;font-size:13px;line-height:1.5;color:#6b7280;">
        Need help? Contact
        <a href="mailto:support@linklite.dev" style="color:#4b5563;text-decoration:none;font-weight:600;">support@linklite.dev</a>
      </p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">
        Security issues:
        <a href="mailto:security@linklite.dev" style="color:#4b5563;text-decoration:none;font-weight:600;">security@linklite.dev</a>
      </p>
      <p style="margin:10px 0 0 0;font-size:12px;line-height:1.4;color:#9ca3af;text-align:right;">
        &copy; LinkLite 2026
      </p>
    `;
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
