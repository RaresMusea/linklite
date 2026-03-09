import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

const isProd = process.env.NODE_ENV === 'production'; // TODO move this logic to shared lib

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),

    baseURL: process.env.BETTER_AUTH_URL!,
    secret: process.env.BETTER_AUTH_SECRET!,

    emailAndPassword: {
        enabled: true,
    },

    advanced: { defaultCookieAttributes: { secure: isProd, sameSite: 'lax', httpOnly: true } },

    
});
