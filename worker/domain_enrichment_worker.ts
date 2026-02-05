import { getDomainProvidersLocks } from '@/dal/domains/domains.repo';
import {
    claimNextDomainEnrichmentJob,
    markDomainEnrichmentJobAsDone,
    requeueDomainEnrichmentJob,
} from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.repo';
import {
    generateDomainEnrichmentJobSummary,
    processDomainEnrichment,
} from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.service';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logging/logger';
import { ClaimedDomainJob } from '@/dal/domain_enrichment_jobs/domain_enrichment_jobs.types';
import { DomainEnrichmentJobResult } from '@/worker/domain_enrichment_worker_types';
import { sleep } from '@/lib/timeouts';
import { msSince } from '@/lib/time';
import { normalizeError } from '@/lib/errors/utils';

const IDLE_SLEEP_MS = 1000;
const workerLog = logger.component('worker.domain_enrichment').child(undefined, ['worker', 'domain-enrichment']);

function minDate(a: Date, b: Date): Date {
    return a.getTime() <= b.getTime() ? a : b;
}

function jobLogger(base: typeof workerLog, job: ClaimedDomainJob) {
    return base.child({
        jobId: job.id,
        domainId: job.domainId,
        hostname: job.hostname,
        attempt: job.attempts,
    });
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
        workerLog.debug('Attempting to claim the next job');
        const job = await claimNextDomainEnrichmentJob();

        if (!job) {
            workerLog.debug(`No jobs found. Sleeping for ${IDLE_SLEEP_MS}ms...`);
            await sleep(IDLE_SLEEP_MS);
            continue;
        }

        const startedAtMs = Date.now();
        const jobLog = jobLogger(workerLog, job).component('job');
        jobLog.info('Job claimed');

        try {
            const runAfter = await getNextAllowedRunAfter(job.domainId);

            if (runAfter) {
                jobLog.warn('Provider locked. Attempting to requeue job', {
                    result: 'FAILED' satisfies DomainEnrichmentJobResult,
                    durationMs: msSince(startedAtMs),
                    runAfter: runAfter.toISOString(),
                    reason: 'Domain provider locked',
                });

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
            const summary = await generateDomainEnrichmentJobSummary(job.id);

            jobLog.info('Job finished', {
                result: 'DONE' satisfies DomainEnrichmentJobResult,
                durationMs: msSince(startedAtMs),
                registeredAtFound: summary?.registeredAtFound ?? 'Unknown',
                provider: summary?.provider ?? 'UNKNOWN',
                domainStatus: summary?.domainStatus ?? 'UNKNOWN',
                jobStatus: summary?.jobStatus ?? 'UNKNOWN',
            });
        } catch (error) {
            const normalizedError = normalizeError(error);

            jobLog.error('Job failed', {
                result: 'FAILED' satisfies DomainEnrichmentJobResult,
                durationMs: Date.now() - startedAtMs,
                error: error,
            });
            await requeueDomainEnrichmentJob({ jobId: job.id, attempts: job.attempts, error: normalizedError });
        }
    }
}

main().catch(async (error) => {
    logger.error('FATAL DOMAIN ENRICHMENT WORKER ERROR', {
        component: 'worker.domain_enrichment',
        error,
    });
    await prisma.$disconnect();
    process.exit(1);
});
