import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { extractErrorCode, extractErrorMessage } from '@/lib/errors/utils';
import { FetchWhoisInfoResponse } from '@/lib/whois/whois.types';
import { parseDDMonYYYY } from '@/lib/dates';

const execFileAsync = promisify(execFile);


const CREATION_DATE_REGEXES: RegExp[] = [
    /^\s*Creation Date\s*:\s*(.+)$/im,
    /^\s*Created On\s*:\s*(.+)$/im,
    /^\s*Created\s*:\s*(.+)$/im,
    /^\s*Registered On\s*:\s*(.+)$/im,
    /^\s*Domain Registration Date\s*:\s*(.+)$/im,
];

export function extractWhoisRegistrationDate(text: string): Date | null {
    for (const re of CREATION_DATE_REGEXES) {
        const match = text.match(re);
        if (!match) continue;

        const raw = match[1].trim();

        const dateFromConstructor = new Date(raw);
        if (!Number.isNaN(dateFromConstructor.getTime())) {
            return dateFromConstructor;
        }

        const dateFromParser = parseDDMonYYYY(raw);
        if (dateFromParser) {
            return dateFromParser;
        }
    }

    return null;
}

export async function fetchWhoisTextViaCli(
    domain: string,
    whoisBinary: string = 'whois'
): Promise<FetchWhoisInfoResponse> {
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
