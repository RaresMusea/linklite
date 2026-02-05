export type ClaimedLinkJob = {
    id: string;
    linkId: string;
    targetUrl: string;
    attempts: number;
};
