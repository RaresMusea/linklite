import { describe, beforeEach, afterEach, it, vi, expect, Mock } from 'vitest';
import { execFile } from 'node:child_process';
import { extractErrorCode, extractErrorMessage } from '@/lib/errors/utils';
import { fetchWhoisTextViaCli } from '@/lib/whois/whois.endpoints';

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

const execFileMock = vi.mocked(execFile);

describe('fetchWhoisTextViaCli', () => {
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
                text: mockStdout,
            });

            expect(execFile).toHaveBeenCalledWith(
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
                error: 'Empty WHOIS output',
            });
        });

        it('should handle whitespace-only output', async () => {
            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(null, { stdout: '   \n\t\n   ', stderr: '' });
            });

            const result = await fetchWhoisTextViaCli('example.com');

            // After trim(), whitespace-only becomes empty string
            expect(result).toEqual({
                ok: false,
                error: 'Empty WHOIS output',
            });
        });

        it('should trim the combined output', async () => {
            const mockStdout = '  Domain: example.com  \n';
            const mockStderr = '  Warning message  \n';

            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(null, { stdout: mockStdout, stderr: mockStderr });
            });

            const result = await fetchWhoisTextViaCli('example.com');

            expect(result.ok).toBe(true);

            if (result.ok) {
                const lines = result.text.split('\n');
                expect(lines[0]).toBe('Domain: example.com  ');
                expect(lines[1]).toBe('');
                expect(lines[2]).toBe('  Warning message');
                expect(result.text).toBe('Domain: example.com  \n\n  Warning message');
            }
        });
    });

    describe('error cases', () => {
        it('should handle execFile error with extracted error info', async () => {
            const mockError: ErrorWithCode = new Error('WHOIS command failed');
            mockError.code = 1;

            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(mockError, null);
            });

            (extractErrorMessage as Mock).mockReturnValue('WHOIS command failed');
            (extractErrorCode as Mock).mockReturnValue(1);

            const result = await fetchWhoisTextViaCli('example.com');

            expect(result).toEqual({
                ok: false,
                error: 'WHOIS command failed',
                code: 1,
            });

            expect(extractErrorMessage).toHaveBeenCalledWith(mockError);
            expect(extractErrorCode).toHaveBeenCalledWith(mockError);
        });

        it('should handle timeout error', async () => {
            const mockError: ErrorWithCode = new Error('Command timed out');
            mockError.code = 'ETIMEDOUT';

            (execFileMock as Mock).mockImplementation((command, args, options, callback) => {
                callback(mockError, null);
            });

            (extractErrorMessage as Mock).mockReturnValue('Command timed out');
            (extractErrorCode as Mock).mockReturnValue(undefined); // code is string, not number

            const result = await fetchWhoisTextViaCli('example.com');

            expect(result).toEqual({
                ok: false,
                error: 'Command timed out',
                code: undefined,
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
                code: undefined,
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
                code: undefined,
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
                code: undefined,
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
                code: undefined,
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
                    maxBuffer: 2 * 1024 * 1024, // 2MB
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
                'münchen.de', // IDN domain
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
