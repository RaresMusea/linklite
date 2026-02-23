import { randomUUID } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { getClientIp, hashIp } from '@/lib/network/ip';
import { upsertAnonActor } from '@/dal/anon_actors/anon_actors.repo';
import { toAnonActorQuota } from '@/dal/anon_actors/anon_actors.types';

const ANON_COOKIE = 'anon_id';
const ANON_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function shouldUseSecureCookie(): boolean {
    return process.env.NODE_ENV === 'production';
}

/**
 * Gets or creates anon_id cookie and ensures AnonActor row exists.
 * Returns anonId and whether it was newly created (cookie-wise).
 */
export async function getOrCreateAnonActor() {
    const cookieStore = await cookies();
    let anonId = cookieStore.get(ANON_COOKIE)?.value ?? null;
    let isNewCookie = false;

    if (!anonId) {
        anonId = randomUUID();
        isNewCookie = true;

        cookieStore.set({
            name: ANON_COOKIE,
            value: anonId,
            httpOnly: true,
            sameSite: 'lax',
            secure: shouldUseSecureCookie(),
            path: '/',
            maxAge: ANON_MAX_AGE_SECONDS,
        });
    }

    const userIp = getClientIp(await headers());
    const actor = await upsertAnonActor(anonId, hashIp(userIp));

    return {
        isNewCookie,
        quota: toAnonActorQuota(actor),
    };
}
