type ResetPasswordTemplateParams = {
    name?: string | null;
    resetUrl: string;
};

export function resetPasswordTemplate({ name, resetUrl }: ResetPasswordTemplateParams) {
    const greeting = name ? `Hi ${name},` : 'Hello!';
    const safeGreeting = escapeHtml(greeting);
    const safeResetUrl = escapeHtml(resetUrl);
    const logoUrl = escapeHtml(getBrandLogoUrl(resetUrl));

    return {
        subject: 'Reset your LinkLite password',
        text: [
            'LinkLite',
            '',
            greeting,
            '',
            'We received a request to reset your password.',
            'Use the link below to set a new password:',
            resetUrl,
            '',
            'If you did not request this, you can safely ignore this email.',
        ].join('\n'),
        html: `
      <div style="background:#f6f6f8;padding:24px 12px;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ececf1;border-radius:12px;padding:28px;font-family:Arial,sans-serif;line-height:1.6;color:#111111;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
            <img
              src="${logoUrl}"
              alt="LinkLite"
              width="36"
              height="36"
              style="display:block;width:36px;height:36px;border-radius:10px;"
            />
            <span style="font-size:34px;font-weight:800;line-height:1;">
              <span style="color:#111111;">Link</span><span style="color:#ff7a00;">Lite</span>
            </span>
          </div>

          <h2 style="margin:0 0 10px 0;font-size:24px;line-height:1.2;color:#111111;">Reset your password</h2>
          <p style="margin:0 0 10px 0;">${safeGreeting}</p>
          <p style="margin:0 0 16px 0;">We received a request to reset your password.</p>

          <div style="margin:0 0 16px 0;">
            <a
              href="${safeResetUrl}"
              style="display:inline-block;padding:12px 18px;border-radius:10px;text-decoration:none;background:#ff7a00;color:#ffffff;font-weight:700;"
            >
              Reset password
            </a>
          </div>

          <p style="margin:0 0 8px 0;color:#4b5563;">If the button does not work, use this link:</p>
          <p style="margin:0 0 16px 0;">
            <a href="${safeResetUrl}" style="color:#ff7a00;word-break:break-word;">${safeResetUrl}</a>
          </p>
          <p style="margin:0;color:#4b5563;">If you did not request this, you can safely ignore this email.</p>
        </div>
      </div>
    `,
    };
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function getBrandLogoUrl(resetUrl: string): string {
    const fallbackBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

    try {
        const origin = new URL(resetUrl).origin;
        return `${origin}/linklite.svg`;
    } catch {
        return fallbackBaseUrl ? `${fallbackBaseUrl}/linklite.svg` : '';
    }
}
