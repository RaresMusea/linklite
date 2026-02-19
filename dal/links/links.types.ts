import { hasNullableOrUndefinedString, hasString, isPlainObject } from '@/lib/guards';
import { MinimalDomain } from '@/dal/domains/domains.types';

export type CreateLinkInput = {
    slug: string;
    targetUrl: string;
    ownerId?: string | null;
};

export type CreatedLink = {
    id: string;
    domainId: string | null;
    slug: string;
    targetUrl: string;
    ownerId?: string | null;
};

export type CreatedLinkResponse = {
    created: CreatedLink;
    shortUrl: string;
};

export type LinkRedirectData = {
    slug: string;
    targetUrl: string;
    isShortener: boolean | null;
    redirectTargetUrl: string | null;
    redirectStatusCode: number | null;
    redirectCheckedAt: Date | null;
    domain: {
        hostname: string;
        status: string;
        registeredAt: Date | null;
        checkedAt: Date | null;
    } | null;
};

export type LinkRiskInput = {
    targetUrl: string;
    isShortener: boolean;
    hasRedirect: boolean;
    redirectStatusCode?: number;
    domain?: MinimalDomain | null;
};

export function isCreatedLink(x: unknown): x is CreatedLink {
    if (!isPlainObject(x)) return false;

    return hasString(x, 'id') && hasString(x, 'targetUrl') && hasNullableOrUndefinedString(x, 'ownerId');
}

export function isCreatedLinkResponse(x: unknown): x is CreatedLinkResponse {
    if (!isPlainObject(x)) return false;

    return 'created' in x && isCreatedLink(x.created) && hasString(x, 'shortUrl');
}
