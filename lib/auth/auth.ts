import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { accountVerificationTemplate } from '@/lib/email/templates/account_verification';
import { sendEmail } from '@/lib/email/send_email';
import { resetPasswordTemplate } from '@/lib/email/templates/reset_password';

const isProd = process.env.NODE_ENV === 'production'; // TODO move this logic to shared lib

function toTokenVerificationRoute(url: string): string {
    try {
        const parsedUrl = new URL(url);
        const token = parsedUrl.searchParams.get('token');

        if (!token) return url;

        return `${parsedUrl.origin}/verify-email/${encodeURIComponent(token)}`;
    } catch {
        return url;
    }
}

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),

    baseURL: process.env.BETTER_AUTH_URL!,
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins: process.env.TRUSTED_ORIGINS!.split(','),

    emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ user, url }) => {
            const template = resetPasswordTemplate({
                name: user.name,
                resetUrl: url,
            });

            await sendEmail({
                to: user.email,
                subject: template.subject,
                html: template.html,
                text: template.text,
            });
        },
    },
    emailVerification: {
        sendOnSignUp: true,
        sendVerificationEmail: async ({ user, url }) => {
            const template = accountVerificationTemplate({
                name: user.name,
                verificationUrl: toTokenVerificationRoute(url),
            });

            await sendEmail({
                to: user.email,
                subject: template.subject,
                html: template.html,
                text: template.text,
            });
        },
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_AUTH_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_AUTH_CLIENT_SECRET!,
        },
    },
    advanced: { defaultCookieAttributes: { secure: isProd, sameSite: 'lax', httpOnly: true } },
});
