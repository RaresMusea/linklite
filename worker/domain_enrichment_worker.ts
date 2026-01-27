import { getDomainProvidersLocks } from '@/dal/domains/domains.repo';
import {
    claimNextDomainEnrichmentJob,
    markDomainEnrichmentJobAsDone,
    requeueDomainEnrichmentJob,
} from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.repo';
import { processDomainEnrichment } from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.service';
import { prisma } from '@/lib/prisma';

const IDLE_SLEEP_MS = 1000;

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function minDate(a: Date, b: Date): Date {
    return a.getTime() <= b.getTime() ? a : b;
}

function getLockOrDefault(lock: Date | null): Date | null {
    const now = new Date();

    return lock && lock > now ? lock : null;
}

/**
 * If provider cooldown locks are active, returns the earliest time we should try again.
 * Otherwise, returns null.
 */
async function getNextAllowedRunAfter(domainId: string): Promise<Date | null> {
    const domainProvidersLocks = await getDomainProvidersLocks(domainId);

    if (!domainProvidersLocks) return null;

    const rdapLocked = getLockOrDefault(domainProvidersLocks.rdapFetchLockedUntil);
    const whoisLocked = getLockOrDefault(domainProvidersLocks.whoisFetchLockedUntil);

    if (rdapLocked && whoisLocked) {
        return minDate(rdapLocked, whoisLocked);
    }

    return rdapLocked ?? whoisLocked;
}

async function main(): Promise<void> {
    while (true) {
        const job = await claimNextDomainEnrichmentJob();

        if (!job) {
            //TODO: Add log here
            await sleep(IDLE_SLEEP_MS);
            continue;
        }

        try {
            const runAfter = await getNextAllowedRunAfter(job.domainId);

            if (runAfter) {
                await requeueDomainEnrichmentJob({
                    jobId: job.id,
                    attempts: job.attempts,
                    error: new Error('Provider locked!'),
                    runAfter,
                });
                continue;
            }

            await processDomainEnrichment(job.hostname, job.domainId);
            await markDomainEnrichmentJobAsDone(job.id);
        } catch (error) {
            const normalizedError =
                error instanceof Error ? error : new Error(typeof error === 'string' ? error : JSON.stringify(error));
            // TODO: Add logging and remove the console.error(...)
            console.error('Domain enrichment worker job failed:', { ...job, error });
            await requeueDomainEnrichmentJob({ jobId: job.id, attempts: job.attempts, error: normalizedError });
        }
    }
}

main().catch( async (error) => {
    console.error(`FATAL DOMAIN ENRICHMENT WORKER ERROR: ${error}`);
    await prisma.$disconnect();
    process.exit(1);
})
