import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { accountVerificationTemplate } from '@/lib/email/templates/account_verification';
import { sendEmail } from '@/lib/email/send_email';
import { resetPasswordTemplate } from '@/lib/email/templates/reset_password';

const isProd = process.env.NODE_ENV === 'production'; // TODO move this logic to shared lib
const fallbackBaseURL = 'http://localhost:3000';
const betterAuthBaseURL = process.env.BETTER_AUTH_URL ?? fallbackBaseURL;
const betterAuthSecret = process.env.BETTER_AUTH_SECRET ?? 'build-only-better-auth-secret-change-me';
const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? betterAuthBaseURL)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

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

function toResetPasswordRoute(url: string): string {
    try {
        const parsedUrl = new URL(url);
        const tokenFromQuery = parsedUrl.searchParams.get('token');
        const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
        const tokenFromPath = pathSegments[pathSegments.length - 1];
        const token = tokenFromQuery || tokenFromPath;

        if (!token) return url;

        return `${parsedUrl.origin}/reset-password/${encodeURIComponent(token)}`;
    } catch {
        return url;
    }
}

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),

    baseURL: betterAuthBaseURL,
    secret: betterAuthSecret,
    trustedOrigins,

    emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ user, url }) => {
            const template = resetPasswordTemplate({
                name: user.name,
                resetUrl: toResetPasswordRoute(url),
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
