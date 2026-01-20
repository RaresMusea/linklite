import { hasArray, isPlainObject } from '@/lib/guards';

export type RdapProvider = {
    baseUrl: string;
    buildPath: (hostname: string) => string;
};

export type RdapEvent = {
    eventAction?: unknown;
    eventDate?: unknown;
};

export type RdapLike = {
    events?: unknown;
};

export type FetchRdapInfoResponse =
    | { ok: true; status: number; json: unknown }
    | { ok: false; status: number; error?: string };

export function asRdapEvents(json: unknown): RdapEvent[] | null {
    if (!isPlainObject(json) || !hasArray(json, 'events')) return null;

    const events = json.events;
    if (!Array.isArray(events)) return null;

    return events.map((e) => (isPlainObject(e) ? e : ({} as Record<string, unknown>)));
}
