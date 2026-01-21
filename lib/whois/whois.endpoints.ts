import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { extractErrorCode, extractErrorMessage } from '@/lib/errors/utils';
import { FetchWhoisInfoResponse } from '@/lib/whois/whois.types';

const execFileAsync = promisify(execFile);

export async function fetchWhoisTextViaCli(domain: string, whoisBinary: string = 'whois'): Promise<FetchWhoisInfoResponse> {
    try {
        const { stdout, stderr } = await execFileAsync(whoisBinary, [domain], {
            timeout: 12_000,
            maxBuffer: 2 * 1024 * 1024,
        });

        const text = `${stdout ?? ''}\n${stderr ?? ''}`.trim();
        if (!text) return { ok: false, error: 'Empty WHOIS output' };

        return { ok: true, text };
    } catch (err: unknown) {
        return {
            ok: false,
            error: extractErrorMessage(err),
            code: extractErrorCode(err),
        };
    }
}
