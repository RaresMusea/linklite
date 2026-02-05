import { logger } from '@/lib/logging/logger';
import {
    claimNextLinkEnrichmentJob,
    markLinkEnrichmentJobAsDone,
    requeueLinkEnrichmentJob,
} from '@/dal/link_enrichment_jobs/link_enrichment_jobs.repo';
import { sleep } from '@/lib/timeouts';
import { ClaimedLinkJob } from '@/dal/link_enrichment_jobs/link_enrichment_jobs.types';
import { isPrivateOrLocalhost } from '@/dal/link_enrichment_jobs/link_enrichment_jobs.service';
import { probeRedirect } from '@/lib/redirect_safety/redirect_probe';
import { inferIsShortener } from '@/lib/redirect_safety/link_shortener_check';
import { applyRedirectProbeResult } from '@/dal/links/links.repo';
import { msSince } from '@/lib/time';
import { normalizeError } from '@/lib/errors/utils';
import { prisma } from '@/lib/prisma';
import { LinkEnrichmentJobResult } from '@/worker/link_enrcihment/link_enrichment_worker.types';

const workerLog = logger.component('worker.link_enrichment').child(undefined, ['worker', 'link-enrichment']);
const IDLE_SLEEP_MS = 1500; // 1.5s

function jobLogger(base: typeof workerLog, job: ClaimedLinkJob) {
    return base.child({
        jobId: job.id,
        linkId: job.linkId,
        url: job.targetUrl,
        attempt: job.attempts,
    });
}

async function main(): Promise<void> {
    while (true) {
        workerLog.debug('Attempting to claim the next job');
        const job: ClaimedLinkJob | null = await claimNextLinkEnrichmentJob();

        if (!job) {
            workerLog.debug(`No jobs found. Sleeping for ${IDLE_SLEEP_MS}ms...`);
            await sleep(IDLE_SLEEP_MS);
            continue;
        }

        const startedAtMs = Date.now();
        const jobLog = jobLogger(workerLog, job).component('job');
        jobLog.info('Job claimed');

        try {
            let url: URL;
            try {
                url = new URL(job.targetUrl);
            } catch {
                jobLog.warn('Invalid URL, marking job as DONE');
                await markLinkEnrichmentJobAsDone(job.id);
                continue;
            }

            if (isPrivateOrLocalhost(url.hostname)) {
                jobLog.warn('Blocked SSRF target, marking job as DONE', {
                    hostname: url.hostname,
                });
                await markLinkEnrichmentJobAsDone(job.id);
                continue;
            }

            const probeResult = await probeRedirect(job.targetUrl);
            const isShortener = inferIsShortener(url.hostname, probeResult);

            await applyRedirectProbeResult(job.linkId, probeResult, isShortener);
            await markLinkEnrichmentJobAsDone(job.id);

            jobLog.info('Job finished', {
                result: 'DONE' satisfies LinkEnrichmentJobResult,
                durationMs: msSince(startedAtMs),
                kind: probeResult.kind,
                isShortener,
            });
        } catch (error) {
            const normalizedError = normalizeError(error);

            jobLog.error('Job failed', {
                result: 'FAILED' satisfies LinkEnrichmentJobResult,
                durationMs: msSince(startedAtMs),
                error: normalizedError,
            });

            await requeueLinkEnrichmentJob({
                jobId: job.id,
                attempts: job.attempts,
                error: normalizedError,
            });
        }
    }
}

main().catch(async (error) => {
    logger.error('FATAL LINK ENRICHMENT WORKER ERROR', {
        component: 'worker.link_enrichment',
        error,
    });
    await prisma.$disconnect();
    process.exit(1);
});
