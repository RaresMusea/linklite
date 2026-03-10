import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { accountVerificationTemplate } from '@/lib/email/templates/account_verification';
import { sendEmail } from '@/lib/email/send_email';

const isProd = process.env.NODE_ENV === 'production'; // TODO move this logic to shared lib

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),

    baseURL: process.env.BETTER_AUTH_URL!,
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins: process.env.TRUSTED_ORIGINS!.split(','),

    emailAndPassword: {
        enabled: true,
    },
    emailVerification: {
        sendOnSignUp: true,
        sendVerificationEmail: async ({ user, url }) => {
            const template = accountVerificationTemplate({
                name: user.name,
                verificationUrl: url,
            });

            await sendEmail({
                to: user.email,
                subject: template.subject,
                html: template.html,
                text: template.text,
            });
        },
    },
    advanced: { defaultCookieAttributes: { secure: isProd, sameSite: 'lax', httpOnly: true } },
});
