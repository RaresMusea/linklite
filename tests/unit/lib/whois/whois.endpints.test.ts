import { describe, beforeEach, afterEach, it, vi, expect, Mock } from 'vitest';
import { execFile } from 'node:child_process';
import { extractErrorCode, extractErrorMessage } from '@/lib/errors/utils';
import {
    extractWhoisRegistrationDate,
    fetchWhoisTextViaCli,
    isWhoisNotFound,
    isWhoisRedacted,
} from '@/lib/whois/whois.endpoints';

interface ErrorWithCode extends Error {
    code?: number | string;
}

// Mock the entire child_process module
vi.mock('node:child_process', () => ({
    execFile: vi.fn(),
}));

vi.mock('@/lib/errors/utils', () => ({
    extractErrorMessage: vi.fn(),
    extractErrorCode: vi.fn(),
}));

const { parseDDMonYYYYMock } = vi.hoisted(() => {
    return {
        parseDDMonYYYYMock: vi.fn(),
    };
});

vi.mock('@/lib/dates', () => ({
    parseDDMonYYYY: parseDDMonYYYYMock,
}));

const execFileMock = vi.mocked(execFile);

describe('Fetch WHOIS text via CLI tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('successful cases', () => {
        it('should return successful response with stdout text', async () => {
            const mockStdout = 'Domain: example.com\nRegistrar: Example Registrar\nStatus: active';
            const mockStderr = '';

            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(null, { stdout: mockStdout, stderr: mockStderr });
            });

            const result = await fetchWhoisTextViaCli('example.com');

            expect(result).toEqual({
                ok: true,
                status: 200,
                text: mockStdout,
            });

            expect(execFileMock).toHaveBeenCalledWith(
                'whois',
                ['example.com'],
                {
                    timeout: 12000,
                    maxBuffer: 2 * 1024 * 1024,
                },
                expect.any(Function)
            );
        });

        it('should combine stdout and stderr into text', async () => {
            const mockStdout = 'Domain: example.com\nRegistrar: Example Registrar';
            const mockStderr = 'Warning: some warning message';

            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(null, { stdout: mockStdout, stderr: mockStderr });
            });

            const result = await fetchWhoisTextViaCli('example.com');

            expect(result).toEqual({
                ok: true,
                status: 200,
                text: 'Domain: example.com\nRegistrar: Example Registrar\nWarning: some warning message',
            });
        });

        it('should handle empty stderr', async () => {
            const mockStdout = 'Domain: example.com';

            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(null, { stdout: mockStdout, stderr: '' });
            });

            const result = await fetchWhoisTextViaCli('example.com');

            expect(result).toEqual({
                ok: true,
                status: 200,
                text: 'Domain: example.com',
            });
        });

        it('should handle null stdout and stderr', async () => {
            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(null, { stdout: null, stderr: null });
            });

            const result = await fetchWhoisTextViaCli('example.com');

            expect(result).toEqual({
                ok: false,
                status: 404,
                error: 'Empty WHOIS output',
            });
        });

        it('should handle empty string output', async () => {
            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(null, { stdout: '', stderr: '' });
            });

            const result = await fetchWhoisTextViaCli('example.com');

            expect(result).toEqual({
                ok: false,
                status: 404,
                error: 'Empty WHOIS output',
            });
        });

        it('should handle whitespace-only output', async () => {
            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(null, { stdout: '   \n\t\n   ', stderr: '' });
            });

            const result = await fetchWhoisTextViaCli('example.com');

            expect(result).toEqual({
                ok: false,
                status: 404,
                error: 'Empty WHOIS output',
            });
        });

        it('should trim only the beginning and end of combined output', async () => {
            const mockStdout = '  Domain: example.com  \n';
            const mockStderr = '  Warning message  \n';

            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(null, { stdout: mockStdout, stderr: mockStderr });
            });

            const result = await fetchWhoisTextViaCli('example.com');

            expect(result.ok).toBe(true);

            if (result.ok) {
                expect(result.text).toBe('Domain: example.com  \n\n  Warning message');
            }
        });
    });

    describe('error cases', () => {
        it('should handle execFile error with extracted error info', async () => {
            const mockError: ErrorWithCode = new Error('WHOIS command failed');

            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(mockError, null);
            });

            (extractErrorMessage as Mock).mockReturnValue('WHOIS command failed');
            (extractErrorCode as Mock).mockReturnValue(1);

            const result = await fetchWhoisTextViaCli('example.com');

            expect(result).toEqual({
                ok: false,
                status: 500,
                error: 'WHOIS command failed',
            });

            expect(extractErrorMessage).toHaveBeenCalledWith(mockError);
        });

        it('should handle timeout error', async () => {
            const mockError: ErrorWithCode = new Error('Command timed out');
            mockError.code = 'ETIMEDOUT';

            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(mockError, null);
            });

            (extractErrorMessage as Mock).mockReturnValue('Command timed out');
            (extractErrorCode as Mock).mockReturnValue(undefined);

            const result = await fetchWhoisTextViaCli('example.com');

            expect(result).toEqual({
                ok: false,
                error: 'Command timed out',
                status: 500
            });
        });

        it('should handle command not found error', async () => {
            const mockError: ErrorWithCode = new Error('Command failed: whois not found');
            mockError.code = 'ENOENT';

            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(mockError, null);
            });

            (extractErrorMessage as Mock).mockReturnValue('Command failed: whois not found');
            (extractErrorCode as Mock).mockReturnValue(undefined);

            const result = await fetchWhoisTextViaCli('example.com');

            expect(result).toEqual({
                ok: false,
                error: 'Command failed: whois not found',
                status: 500,
            });
        });

        it('should handle buffer exceeded error', async () => {
            const mockError: ErrorWithCode = new Error('maxBuffer exceeded');
            mockError.code = 'ENOBUFS';

            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(mockError, null);
            });

            (extractErrorMessage as Mock).mockReturnValue('maxBuffer exceeded');
            (extractErrorCode as Mock).mockReturnValue(undefined);

            const result = await fetchWhoisTextViaCli('example.com');

            expect(result).toEqual({
                ok: false,
                error: 'maxBuffer exceeded',
                status: 500,
            });
        });

        it('should handle error without code', async () => {
            const mockError = new Error('Unknown error');

            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(mockError, null);
            });

            (extractErrorMessage as Mock).mockReturnValue('Unknown error');
            (extractErrorCode as Mock).mockReturnValue(undefined);

            const result = await fetchWhoisTextViaCli('example.com');

            expect(result).toEqual({
                ok: false,
                error: 'Unknown error',
                status: 500,
            });
        });

        it('should handle non-Error object thrown', async () => {
            const mockError = 'Something went wrong';

            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(mockError, null);
            });

            (extractErrorMessage as Mock).mockReturnValue('Something went wrong');
            (extractErrorCode as Mock).mockReturnValue(undefined);

            const result = await fetchWhoisTextViaCli('example.com');

            expect(result).toEqual({
                ok: false,
                error: 'Something went wrong',
                status: 500,
            });
        });
    });

    describe('execFile options', () => {
        it('should pass correct options to execFile', async () => {
            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(null, { stdout: 'Domain: test.com', stderr: '' });
            });

            await fetchWhoisTextViaCli('test.com');

            expect(execFileMock).toHaveBeenCalledWith(
                'whois',
                ['test.com'],
                {
                    timeout: 12000,
                    maxBuffer: 2 * 1024 * 1024,
                },
                expect.any(Function)
            );
        });

        it('should handle different domains correctly', async () => {
            const testCases = [
                'example.com',
                'sub.example.co.uk',
                'example-with-dash.com',
                '123test.com',
                'münchen.de',
            ];

            for (const domain of testCases) {
                (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                    callback(null, { stdout: `Domain: ${domain}`, stderr: '' });
                });

                const result = await fetchWhoisTextViaCli(domain);

                expect(execFileMock).toHaveBeenCalledWith('whois', [domain], expect.any(Object), expect.any(Function));

                expect(result.ok).toBe(true);

                if (result.ok) {
                    expect(result.text).toContain(domain);
                } else {
                    throw new Error(`Expected ok:true but got ok:false for domain ${domain}`);
                }
            }
        });
    });

    describe('edge cases', () => {
        it('should handle very long WHOIS output', async () => {
            const longOutput = 'Domain: example.com\n' + 'Details: ' + 'x'.repeat(1000000);

            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(null, { stdout: longOutput, stderr: '' });
            });

            const result = await fetchWhoisTextViaCli('example.com');

            expect(result.ok).toBe(true);

            if (result.ok) {
                expect(result.text.length).toBeGreaterThan(1000000);
            } else {
                throw new Error('Expected ok:true but got ok:false');
            }
        });

        it('should handle newlines and special characters in output', async () => {
            const output = 'Domain: example.com\nRegistrar: Test & Co.\nEmail: test@example.com\nNotes: "quoted text"';

            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(null, { stdout: output, stderr: '' });
            });

            const result = await fetchWhoisTextViaCli('example.com');

            expect(result.ok).toBe(true);

            if (result.ok) {
                expect(result.text).toContain('Test & Co.');
                expect(result.text).toContain('"quoted text"');
            } else {
                throw new Error('Expected ok:true but got ok:false');
            }
        });

        it('should handle stderr with important information', async () => {
            const mockStdout = 'No match for "EXAMPLE.COM".';
            const mockStderr = '>>> Last update of whois database: 2024-01-15T10:30:00Z <<<';

            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(null, { stdout: mockStdout, stderr: mockStderr });
            });

            const result = await fetchWhoisTextViaCli('EXAMPLE.COM');

            expect(result.ok).toBe(true);

            if (result.ok) {
                expect(result.text).toContain('No match');
                expect(result.text).toContain('Last update');
            } else {
                throw new Error('Expected ok:true but got ok:false');
            }
        });
    });
});

describe('extractWhoisRegistrationDate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        parseDDMonYYYYMock.mockReset();
    });

    describe('successful extraction', () => {
        it('should extract date using "Creation Date" pattern', () => {
            const text = `Domain Name: example.com
Creation Date: 2023-01-15T10:30:00Z
Registrar: Example Registrar`;

            const result = extractWhoisRegistrationDate(text);
            expect(result).toBeInstanceOf(Date);
            expect(result!.toISOString()).toBe('2023-01-15T10:30:00.000Z');
        });

        it('should extract date using "Created On" pattern without calling parseDDMonYYYY', () => {
            const text = `Created On: 15-Jan-2023
Expiration Date: 15-Jan-2024`;

            const result = extractWhoisRegistrationDate(text);
            expect(result).toBeInstanceOf(Date);
            expect(parseDDMonYYYYMock).not.toHaveBeenCalled();
            expect(result!.getFullYear()).toBe(2023);
            expect(result!.getMonth()).toBe(0);
            expect(result!.getDate()).toBe(15);
        });

        it('should extract date using "Created" pattern', () => {
            const text = `Domain: example.com
Created: 2023-01-15
Updated: 2023-06-15`;

            const result = extractWhoisRegistrationDate(text);
            expect(result).toBeInstanceOf(Date);
            expect(result!.toISOString()).toBe('2023-01-15T00:00:00.000Z');
        });

        it('should extract date using "Registered On" pattern', () => {
            const text = `Registered On: 2023-01-15T10:30:00+02:00
Status: active`;

            const result = extractWhoisRegistrationDate(text);
            expect(result).toBeInstanceOf(Date);
            expect(result!.toISOString()).toBe('2023-01-15T08:30:00.000Z');
        });

        it('should extract date using "Domain Registration Date" pattern', () => {
            const text = `Domain Registration Date: 15-Jan-2023
Name Server: ns1.example.com`;

            const mockDate = new Date('2023-01-15T00:00:00Z');
            parseDDMonYYYYMock.mockReturnValue(mockDate);

            const result = extractWhoisRegistrationDate(text);
            expect(result).toBeInstanceOf(Date);
            expect(parseDDMonYYYYMock).not.toHaveBeenCalledWith('15-Jan-2023');
        });

        it('should use first matching pattern if multiple exist', () => {
            const text = `Creation Date: 2023-01-15
Created On: 2023-01-16`;

            const result = extractWhoisRegistrationDate(text);
            expect(result).toBeInstanceOf(Date);
            expect(result!.toISOString()).toBe('2023-01-15T00:00:00.000Z');
        });

        it('should handle whitespace variations', () => {
            const testCases = [
                'Creation Date:2023-01-15',
                'Creation Date: 2023-01-15',
                'Creation Date:   2023-01-15',
                'Creation Date : 2023-01-15',
                'Creation Date :2023-01-15',
            ];

            testCases.forEach((text) => {
                const result = extractWhoisRegistrationDate(text);
                expect(result).toBeInstanceOf(Date);
                expect(result!.toISOString()).toBe('2023-01-15T00:00:00.000Z');
            });
        });

        it('should handle case-insensitive patterns', () => {
            const testCases = [
                'CREATION DATE: 2023-01-15',
                'creation date: 2023-01-15',
                'Creation date: 2023-01-15',
                'cReAtIoN dAtE: 2023-01-15',
            ];

            testCases.forEach((text) => {
                const result = extractWhoisRegistrationDate(text);
                expect(result).toBeInstanceOf(Date);
            });
        });
    });

    describe('date parsing logic', () => {
        beforeEach(() => {
            parseDDMonYYYYMock.mockReset();
        });

        it('should handle Date constructor failure and fallback to parseDDMonYYYY', () => {
            const text = 'Creation Date: invalid-date-format';

            parseDDMonYYYYMock.mockReturnValue(null);

            const result = extractWhoisRegistrationDate(text);

            expect(parseDDMonYYYYMock).toHaveBeenCalledWith('invalid-date-format');
            expect(result).toBeNull();
        });

        it('should use parseDDMonYYYY for formats that Date constructor fails on', () => {
            const text = 'Creation Date: not-a-date-at-all';
            const mockDate = new Date('2023-01-15T00:00:00Z');
            parseDDMonYYYYMock.mockReturnValue(mockDate);

            const result = extractWhoisRegistrationDate(text);

            expect(parseDDMonYYYYMock).toHaveBeenCalledWith('not-a-date-at-all');
            expect(result).toBe(mockDate);
        });

        it('should handle parseDDMonYYYY returning null when Date constructor also fails', () => {
            const text = 'Creation Date: definitely-not-a-date';
            parseDDMonYYYYMock.mockReturnValue(null);

            const result = extractWhoisRegistrationDate(text);

            expect(parseDDMonYYYYMock).toHaveBeenCalledWith('definitely-not-a-date');
            expect(result).toBeNull();
        });

        it('should trim the extracted date string before parsing', () => {
            const text = 'Creation Date:   definitely-not-a-date   ';
            const mockDate = new Date('2023-01-15T00:00:00Z');
            parseDDMonYYYYMock.mockReturnValue(mockDate);

            const result = extractWhoisRegistrationDate(text);

            expect(parseDDMonYYYYMock).toHaveBeenCalledWith('definitely-not-a-date');
            expect(result).toBe(mockDate);
        });

        it('should use Date constructor for "15-Jan-2023" without calling parseDDMonYYYY', () => {
            const text = 'Creation Date: 15-Jan-2023';

            const result = extractWhoisRegistrationDate(text);

            expect(parseDDMonYYYYMock).not.toHaveBeenCalled();

            expect(result).toBeInstanceOf(Date);
            expect(result!.getFullYear()).toBe(2023);
            expect(result!.getMonth()).toBe(0);
        });

        it('should handle Date constructor succeeding for ISO format', () => {
            const text = 'Creation Date: 2023-01-15T10:30:00Z';

            const result = extractWhoisRegistrationDate(text);

            expect(parseDDMonYYYYMock).not.toHaveBeenCalled();
            expect(result).toBeInstanceOf(Date);
            expect(result!.toISOString()).toBe('2023-01-15T10:30:00.000Z');
        });
    });

    describe('edge cases and failures', () => {
        it('should return null when no pattern matches', () => {
            const text = `Domain: example.com
            Updated: 2023-01-15
            Expires: 2024-01-15`;

            const result = extractWhoisRegistrationDate(text);
            expect(result).toBeNull();
        });

        it('should return null for empty string', () => {
            expect(extractWhoisRegistrationDate('')).toBeNull();
        });

        it('should return null for whitespace-only string', () => {
            expect(extractWhoisRegistrationDate('   \n\t   ')).toBeNull();
        });

        it('should handle multi-line text', () => {
            const text = `
    Domain Name: EXAMPLE.COM
    Registrar: RESERVED-INTERNET ASSIGNED NUMBERS AUTHORITY
    Whois Server: whois.iana.org
    Referral URL: http://res-dom.iana.org
    Name Server: A.IANA-SERVERS.NET
    Name Server: B.IANA-SERVERS.NET
    Status: clientDeleteProhibited
    Status: clientTransferProhibited
    Status: clientUpdateProhibited
    Updated Date: 2022-08-14T07:01:35Z
    Creation Date: 1995-08-14T04:00:00Z
    Expiration Date: 2023-08-13T04:00:00Z
    `;

            const CREATION_DATE_REGEXES: RegExp[] = [
                /^\s*Creation Date\s*:\s*(.+)$/im,
                /^\s*Created On\s*:\s*(.+)$/im,
                /^\s*Created\s*:\s*(.+)$/im,
                /^\s*Registered On\s*:\s*(.+)$/im,
                /^\s*Domain Registration Date\s*:\s*(.+)$/im,
            ];

            console.log('Testing regexes against text:');
            console.log('Text preview:', text.substring(0, 200) + '...');

            let foundMatch = false;
            for (let i = 0; i < CREATION_DATE_REGEXES.length; i++) {
                const re = CREATION_DATE_REGEXES[i];
                const match = text.match(re);
                console.log(`Regex ${i} (${re.source}):`, match ? 'MATCHED' : 'NO MATCH');
                if (match) {
                    console.log('  Captured:', match[1]);
                    foundMatch = true;
                }
            }

            if (!foundMatch) {
                console.log('NO REGEX MATCHED!');
                console.log('\nTrying without ^ (start of line anchor):');
                const reWithoutAnchor = /Creation Date\s*:\s*(.+)/i;
                const matchWithoutAnchor = text.match(reWithoutAnchor);
                console.log('Without ^ anchor:', matchWithoutAnchor);
            }

            const result = extractWhoisRegistrationDate(text);
            console.log('Function result:', result);

            expect(result).toBeInstanceOf(Date);
        });

        it('should parse "15-Jan-2010" format using Date constructor (not parseDDMonYYYY)', () => {
            const whoisText = `Registered on: 15-Jan-2010`;

            const result = extractWhoisRegistrationDate(whoisText);

            expect(parseDDMonYYYYMock).not.toHaveBeenCalled();

            expect(result).toBeInstanceOf(Date);
            expect(result!.getFullYear()).toBe(2010);
            expect(result!.getMonth()).toBe(0);
        });

        it('should use parseDDMonYYYY only when Date constructor fails', () => {
            const whoisText = `Registered on: definitely-not-a-date`;

            const mockDate = new Date('2010-01-15T00:00:00Z');
            parseDDMonYYYYMock.mockReturnValue(mockDate);

            const result = extractWhoisRegistrationDate(whoisText);

            expect(parseDDMonYYYYMock).toHaveBeenCalledWith('definitely-not-a-date');
            expect(result).toBe(mockDate);
        });

        it('should handle multiple dates in text - DEBUG', () => {
            const text = `Created: 2022-01-01
    Updated: 2022-06-01
    Creation Date: 2023-01-15
    Expires: 2024-01-15`;

            console.log('Text lines:');
            text.split('\n').forEach((line, i) => {
                console.log(`Line ${i}: "${line}"`);
                console.log(`  Starts with spaces/tabs?`, /^\s/.test(line));
            });

            const createdRegex = /^Created\s*:\s*(.+)$/im;
            const match = text.match(createdRegex);
            console.log('Regex /^Created.../ match:', match);

            const result = extractWhoisRegistrationDate(text);
            console.log('Result:', result);
            console.log('Result ISO:', result ? result.toISOString() : 'null');
        });

        it('should handle invalid date format after successful match', () => {
            const text = 'Creation Date: not-a-valid-date';
            parseDDMonYYYYMock.mockReturnValue(null);

            const result = extractWhoisRegistrationDate(text);
            expect(result).toBeNull();
        });

        it('should handle Date constructor returning invalid date', () => {
            const text = 'Creation Date: definitely-not-a-date';

            const result = extractWhoisRegistrationDate(text);
            expect(result).toBeNull();
        });
    });

    describe('real WHOIS examples', () => {
        it('should parse typical .com WHOIS output', () => {
            const whoisText = `
Domain Name: EXAMPLE.COM
Registry Domain ID: 2336799_DOMAIN_COM-VRSN
Registrar WHOIS Server: whois.registrar.example
Registrar URL: http://www.registrar.example
Updated Date: 2023-08-14T07:01:35Z
Creation Date: 1995-08-14T04:00:00Z
Registry Expiry Date: 2024-08-13T04:00:00Z
Registrar: Example Registrar, Inc.
            `;

            const result = extractWhoisRegistrationDate(whoisText);
            expect(result).toBeInstanceOf(Date);
            expect(result!.getUTCFullYear()).toBe(1995);
        });

        it('should parse .org WHOIS output with different format', () => {
            const whoisText = `
Domain Name: example.org
Registry Domain ID: D1234567-LROR
Registrar WHOIS Server: whois.registrar.example
Registrar URL: https://www.registrar.example
Updated Date: 2023-01-15T10:30:00Z
Creation Date: 2000-01-15T00:00:00Z
Registry Expiry Date: 2024-01-15T00:00:00Z
Registrar Registration Expiration Date: 2024-01-15T00:00:00Z
            `;

            const result = extractWhoisRegistrationDate(whoisText);
            expect(result).toBeInstanceOf(Date);
            expect(result!.getUTCFullYear()).toBe(2000);
        });

        it('should use parseDDMonYYYY only when Date constructor fails', () => {
            const whoisText = `
Domain:             example.co.uk
Registered on:      definitely-not-a-date-format
            `;

            const mockDate = new Date('2010-01-15T00:00:00Z');
            parseDDMonYYYYMock.mockReturnValue(mockDate);

            const result = extractWhoisRegistrationDate(whoisText);

            expect(parseDDMonYYYYMock).toHaveBeenCalledWith('definitely-not-a-date-format');
            expect(result).toBe(mockDate);
        });
    });

    describe('performance and matching order', () => {
        it('should stop at first successful match', () => {
            const text = 'Creation Date: 2023-01-15\nCreated On: 2023-01-16';

            const matchSpy = vi.spyOn(String.prototype, 'match');

            const result = extractWhoisRegistrationDate(text);

            expect(result).toBeInstanceOf(Date);
            expect(matchSpy).toHaveBeenCalledTimes(1);

            matchSpy.mockRestore();
        });

        it('should try patterns in order', () => {
            const text1 = 'Creation Date: 2023-01-15';
            const text2 = 'Created On: 2023-01-15';
            const text3 = 'Created: 2023-01-15';

            expect(extractWhoisRegistrationDate(text1)).toBeInstanceOf(Date);
            expect(extractWhoisRegistrationDate(text2)).toBeInstanceOf(Date);
            expect(extractWhoisRegistrationDate(text3)).toBeInstanceOf(Date);
        });
    });
});

describe('isWhoisNotFound', () => {
    it('should return true for "no match for"', () => {
        expect(isWhoisNotFound('No match for "example.com"')).toBe(true);
        expect(isWhoisNotFound('DOMAIN NOT FOUND')).toBe(true);
    });

    it('should return true for "not found"', () => {
        expect(isWhoisNotFound('Domain not found in registry')).toBe(true);
        expect(isWhoisNotFound('NOT FOUND: example.com')).toBe(true);
    });

    it('should return true for "no data found"', () => {
        expect(isWhoisNotFound('No data found for this domain')).toBe(true);
        expect(isWhoisNotFound('ERROR: NO DATA FOUND')).toBe(true);
    });

    it('should be case insensitive', () => {
        expect(isWhoisNotFound('NO MATCH FOR')).toBe(true);
        expect(isWhoisNotFound('No Match For')).toBe(true);
        expect(isWhoisNotFound('no match for')).toBe(true);
    });

    it('should return false when no match patterns found', () => {
        expect(isWhoisNotFound('Domain example.com is available')).toBe(false);
        expect(isWhoisNotFound('')).toBe(false);
        expect(isWhoisNotFound('Domain registered: example.com')).toBe(false);
    });

    it('should handle mixed case patterns', () => {
        expect(isWhoisNotFound('No Match For domain')).toBe(true);
        expect(isWhoisNotFound('Not Found in database')).toBe(true);
        expect(isWhoisNotFound('No Data Found for query')).toBe(true);
    });
});

describe('isWhoisRedacted', () => {
    it('should return true for "redacted"', () => {
        expect(isWhoisRedacted('Contact information redacted')).toBe(true);
        expect(isWhoisRedacted('REDACTED FOR PRIVACY')).toBe(true);
    });

    it('should return true for "privacy"', () => {
        expect(isWhoisRedacted('Privacy service enabled')).toBe(true);
        expect(isWhoisRedacted('WHOIS PRIVACY PROTECTION')).toBe(true);
    });

    it('should return true for "gdpr"', () => {
        expect(isWhoisRedacted('Data hidden due to GDPR')).toBe(true);
        expect(isWhoisRedacted('GDPR protected data')).toBe(true);
    });

    it('should return true for "data protected"', () => {
        expect(isWhoisRedacted('Registrant data protected')).toBe(true);
        expect(isWhoisRedacted('DATA PROTECTED BY LAW')).toBe(true);
    });

    it('should return true for "not disclosed"', () => {
        expect(isWhoisRedacted('Email not disclosed')).toBe(true);
        expect(isWhoisRedacted('NOT DISCLOSED for privacy')).toBe(true);
    });

    it('should be case insensitive', () => {
        expect(isWhoisRedacted('REDACTED')).toBe(true);
        expect(isWhoisRedacted('Redacted')).toBe(true);
        expect(isWhoisRedacted('redacted')).toBe(true);
        expect(isWhoisRedacted('GDPR')).toBe(true);
        expect(isWhoisRedacted('gdpr')).toBe(true);
    });

    it('should return false when no redaction patterns found', () => {
        expect(isWhoisRedacted('Registrant: John Doe')).toBe(false);
        expect(isWhoisRedacted('')).toBe(false);
        expect(isWhoisRedacted('Domain is active')).toBe(false);
    });

    it('should handle mixed patterns in same text', () => {
        expect(isWhoisRedacted('Data redacted due to GDPR compliance')).toBe(true);
        expect(isWhoisRedacted('Privacy protection - data not disclosed')).toBe(true);
    });

    it('should match partial words correctly', () => {
        expect(isWhoisRedacted('This is a privacy statement')).toBe(true);
        expect(isWhoisRedacted('Data protection active')).toBe(true);
    });
});