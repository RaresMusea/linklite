import { hasNullableOrUndefinedString, hasString, isPlainObject } from '@/lib/guards';

export type CreateLinkInput = {
    slug: string;
    targetUrl: string;
    ownerId?: string | null;
};

export type CreatedLink = {
    id: string;
    slug: string;
    targetUrl: string;
    ownerId?: string | null;
};

export type CreatedLinkResponse = {
    created: CreatedLink;
    shortUrl: string;
};

export function isCreatedLink(x: unknown): x is CreatedLink {
    if (!isPlainObject(x)) return false;

    return hasString(x, 'id') && hasString(x, 'targetUrl') && hasNullableOrUndefinedString(x, 'ownerId');
}

export function isCreatedLinkResponse(x: unknown): x is CreatedLinkResponse {
    if (!isPlainObject(x)) return false;

    return 'created' in x && isCreatedLink(x.created) && hasString(x, 'shortUrl');
}
