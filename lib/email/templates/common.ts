export function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

export function getBrandLogoUrl(sourceUrl: string): string {
    const fallbackBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

    try {
        const origin = new URL(sourceUrl).origin;
        return `${origin}/linklite.svg`;
    } catch {
        return fallbackBaseUrl ? `${fallbackBaseUrl}/linklite.svg` : '';
    }
}
