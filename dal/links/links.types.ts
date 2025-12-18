export type CreateLinkInput = {
    slug: string;
    targetUrl: string;
    ownerId?: string | null;
};

export type CreatedLink = {
    id: string;
    slug: string;
    targetUrl: string;
    ownerId: string | null;
};
