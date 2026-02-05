export type ClaimedLinkJob = {
    id: string;
    linkId: string;
    targetUrl: string;
    attempts: number;
};

export type RequeueLinkEnrichmentJobInput = {
    jobId: string;
    attempts: number;
    error: unknown;
    runAfter?: Date;
};
