import { betterAuth } from 'better-auth';

const isProd = process.env.NODE_ENV === 'production'; // TODO move this logic to shared lib

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL!,
    secret: process.env.BETTER_AUTH_SECRET!,

    emailAndPassword: {
        enabled: true,
    },

    advanced: { defaultCookieAttributes: { secure: isProd, sameSite: 'lax', httpOnly: true } },
});
