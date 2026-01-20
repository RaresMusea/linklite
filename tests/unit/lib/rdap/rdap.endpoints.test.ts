import { describe, beforeEach, afterEach, it, vi, expect, Mock } from 'vitest';
import { getTld } from '@/lib/utils';
import { extractRegistrationDate, fetchRdapJson, getRdapUrl } from '@/lib/rdap/rdap.endpoints';

vi.mock('@/lib/utils', () => ({
    getTld: vi.fn(),
}));

type SuccessResponse = { ok: true; status: number; json: unknown };

export function createMockAbortController(): AbortController {
    const abort = vi.fn();
    const signal = {
        aborted: false,
        onabort: null as null | ((this: AbortSignal, ev: Event) => void),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        reason: undefined,
        throwIfAborted: vi.fn(),
    };

    return {
        abort,
        signal: signal as AbortSignal,
    };
}

describe('RDAP URL retrieval tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return null for domains with unsupported TLDs', () => {
        (getTld as Mock).mockReturnValue('gov');
        expect(getRdapUrl('example.gov')).toBeNull();

        (getTld as Mock).mockReturnValue('mil');
        expect(getRdapUrl('army.mil')).toBeNull();

        (getTld as Mock).mockReturnValue('edu');
        expect(getRdapUrl('harvard.edu')).toBeNull();
    });

    it('should return null for unknown TLDs', () => {
        (getTld as Mock).mockReturnValue('xyz');
        expect(getRdapUrl('example.xyz')).toBeNull();

        (getTld as Mock).mockReturnValue('unknown');
        expect(getRdapUrl('test.unknown')).toBeNull();
    });

    it('should return null when getTld returns null', () => {
        (getTld as Mock).mockReturnValue(null);
        expect(getRdapUrl('localhost')).toBeNull();
        expect(getRdapUrl('192.168.1.1')).toBeNull();
    });

    it('should return correct RDAP URL for .com domains', () => {
        (getTld as Mock).mockReturnValue('com');
        const result = getRdapUrl('example.com');
        expect(result).toBe('https://rdap.verisign.com/com/v1/domain/example.com');
    });

    it('should return correct RDAP URL for .net domains', () => {
        (getTld as Mock).mockReturnValue('net');
        const result = getRdapUrl('example.net');
        expect(result).toBe('https://rdap.verisign.com/net/v1/domain/example.net');
    });

    it('should return correct RDAP URL for .org domains', () => {
        (getTld as Mock).mockReturnValue('org');
        const result = getRdapUrl('example.org');
        expect(result).toBe('https://rdap.publicinterestregistry.org/rdap/domain/example.org');
    });

    it('should return correct RDAP URL for .dev domains', () => {
        (getTld as Mock).mockReturnValue('dev');
        const result = getRdapUrl('example.dev');
        expect(result).toBe('https://rdap.registry.google/rdap/domain/example.dev');
    });

    it('should return correct RDAP URL for .uk domains', () => {
        (getTld as Mock).mockReturnValue('uk');
        const result = getRdapUrl('example.co.uk');
        expect(result).toBe('https://rdap.nominet.uk/domain/example.co.uk');
    });

    it('should URL encode domain names with special characters', () => {
        (getTld as Mock).mockReturnValue('com');
        const result = getRdapUrl('exämple.com');
        expect(result).toBe('https://rdap.verisign.com/com/v1/domain/ex%C3%A4mple.com');
    });

    it('should handle subdomains correctly', () => {
        (getTld as Mock).mockReturnValue('com');
        const result = getRdapUrl('sub.example.com');
        expect(result).toBe('https://rdap.verisign.com/com/v1/domain/sub.example.com');
    });

    it('should handle domains with multiple subdomains', () => {
        (getTld as Mock).mockReturnValue('uk');
        const result = getRdapUrl('deep.nested.example.co.uk');
        expect(result).toBe('https://rdap.nominet.uk/domain/deep.nested.example.co.uk');
    });

    it('should return correct RDAP URL for .ro domains', () => {
        (getTld as Mock).mockReturnValue('ro');
        const result = getRdapUrl('example.ro');
        expect(result).toBe('https://rdap.rotld.ro/rdap/domain/example.ro');
    });

    it('should return correct RDAP URL for .in domains', () => {
        (getTld as Mock).mockReturnValue('in');
        const result = getRdapUrl('example.in');
        expect(result).toBe('https://rdap.registry.in/rdap/domain/example.in');
    });

    it('should return correct RDAP URL for .cn domains', () => {
        (getTld as Mock).mockReturnValue('cn');
        const result = getRdapUrl('example.cn');
        expect(result).toBe('https://rdap.conac.cn/rdap/domain/example.cn');
    });
});

describe('Extract RDAP registration date tests', () => {
    it('should extract registration date from valid RDAP JSON', () => {
        const rdapJson = {
            events: [
                { eventAction: 'registration', eventDate: '2023-01-15T10:30:00Z' },
                { eventAction: 'expiration', eventDate: '2024-01-15T10:30:00Z' },
            ],
        };

        const result = extractRegistrationDate(rdapJson);
        expect(result).toBeInstanceOf(Date);
        expect(result!.toISOString()).toBe('2023-01-15T10:30:00.000Z');
    });

    it('should handle registration event with different casing', () => {
        const rdapJson = {
            events: [
                { eventAction: 'Registration', eventDate: '2023-06-20T14:45:00Z' },
                { eventAction: 'REGISTRATION', eventDate: '2023-06-20T14:45:00Z' },
            ],
        };

        const result = extractRegistrationDate(rdapJson);
        expect(result).toBeInstanceOf(Date);
        expect(result!.toISOString()).toBe('2023-06-20T14:45:00.000Z');
    });

    it('should return first registration event if multiple exist', () => {
        const rdapJson = {
            events: [
                { eventAction: 'registration', eventDate: '2022-01-01T00:00:00Z' },
                { eventAction: 'registration', eventDate: '2023-01-01T00:00:00Z' },
            ],
        };

        const result = extractRegistrationDate(rdapJson);
        expect(result!.toISOString()).toBe('2022-01-01T00:00:00.000Z');
    });

    it('should return null when events array is empty', () => {
        const rdapJson = {
            events: [],
        };

        const result = extractRegistrationDate(rdapJson);
        expect(result).toBeNull();
    });

    it('should return null when no registration event found', () => {
        const rdapJson = {
            events: [
                { eventAction: 'last changed', eventDate: '2023-01-15T10:30:00Z' },
                { eventAction: 'expiration', eventDate: '2024-01-15T10:30:00Z' },
            ],
        };

        const result = extractRegistrationDate(rdapJson);
        expect(result).toBeNull();
    });

    it('should return null for non-object input (asRdapEvents handles this)', () => {
        expect(extractRegistrationDate(null)).toBeNull();
        expect(extractRegistrationDate(undefined)).toBeNull();
        expect(extractRegistrationDate(42)).toBeNull();
        expect(extractRegistrationDate('string')).toBeNull();
        expect(extractRegistrationDate(true)).toBeNull();
    });

    it('should return null when events is not an array (asRdapEvents handles this)', () => {
        const rdapJson = {
            events: 'not an array',
        };

        const result = extractRegistrationDate(rdapJson);
        expect(result).toBeNull();
    });

    it('should return null when events property is missing (asRdapEvents handles this)', () => {
        const rdapJson = {
            otherProperty: 'value',
        };

        const result = extractRegistrationDate(rdapJson);
        expect(result).toBeNull();
    });

    it('should handle events array with non-object elements (asRdapEvents converts them)', () => {
        const rdapJson = {
            events: [null, 'string', 42, { eventAction: 'registration', eventDate: '2023-01-15T10:30:00Z' }],
        };

        const result = extractRegistrationDate(rdapJson);
        expect(result).toBeInstanceOf(Date);
        expect(result!.toISOString()).toBe('2023-01-15T10:30:00.000Z');
    });

    it('should return null when registration event has no eventDate', () => {
        const rdapJson = {
            events: [{ eventAction: 'registration' }, { eventAction: 'registration', eventDate: null }],
        };

        const result = extractRegistrationDate(rdapJson);
        expect(result).toBeNull();
    });

    it('should return null when eventDate is not a string', () => {
        const rdapJson = {
            events: [
                { eventAction: 'registration', eventDate: 12345 },
                { eventAction: 'registration', eventDate: { date: '2023-01-15' } },
                { eventAction: 'registration', eventDate: [] },
            ],
        };

        const result = extractRegistrationDate(rdapJson);
        expect(result).toBeNull();
    });

    it('should return null when eventDate is empty string', () => {
        const rdapJson = {
            events: [{ eventAction: 'registration', eventDate: '' }],
        };

        const result = extractRegistrationDate(rdapJson);
        expect(result).toBeNull();
    });

    it('should handle valid date strings', () => {
        const testCases = [
            { input: '2023-01-15T10:30:00Z', expected: '2023-01-15T10:30:00.000Z' },
            { input: '2023-01-15', expected: '2023-01-15T00:00:00.000Z' },
            { input: '2023-01-15T10:30:00+02:00', expected: '2023-01-15T08:30:00.000Z' },
            { input: 'Sun Jan 15 2023 12:30:00 GMT+0200', expected: '2023-01-15T10:30:00.000Z' },
        ];

        testCases.forEach(({ input, expected }) => {
            const rdapJson = {
                events: [{ eventAction: 'registration', eventDate: input }],
            };

            const result = extractRegistrationDate(rdapJson);
            expect(result).toBeInstanceOf(Date);
            expect(result!.toISOString()).toBe(expected);
        });
    });

    it('should return null for invalid date strings', () => {
        const invalidDates = [
            'not a date',
            '2023-13-45', // Invalid month/day
            '2023-01-15T25:61:61Z', // Invalid time
            'invalid-date-format',
        ];

        invalidDates.forEach((dateStr) => {
            const rdapJson = {
                events: [{ eventAction: 'registration', eventDate: dateStr }],
            };

            const result = extractRegistrationDate(rdapJson);
            expect(result).toBeNull();
        });
    });

    it('should handle eventAction being null/undefined', () => {
        const rdapJson = {
            events: [
                { eventAction: null, eventDate: '2023-01-15T10:30:00Z' },
                { eventAction: undefined, eventDate: '2023-01-15T10:30:00Z' },
                { eventAction: 'registration', eventDate: '2023-01-15T10:30:00Z' },
            ],
        };

        const result = extractRegistrationDate(rdapJson);
        expect(result).toBeInstanceOf(Date);
    });

    it('should handle eventAction being non-string', () => {
        const rdapJson = {
            events: [
                { eventAction: 123, eventDate: '2023-01-15T10:30:00Z' },
                { eventAction: { action: 'registration' }, eventDate: '2023-01-15T10:30:00Z' },
                { eventAction: 'registration', eventDate: '2023-01-15T10:30:00Z' },
            ],
        };

        const result = extractRegistrationDate(rdapJson);
        expect(result).toBeInstanceOf(Date);
    });

    it('should work correctly with asRdapEvents filtering', () => {
        const rdapJson = {
            events: [
                null,
                undefined,
                'string',
                42,
                true,
                [],
                {},
                { eventAction: 'registration', eventDate: '2023-01-15T10:30:00Z' },
                { eventAction: 'registration', eventDate: '2024-01-15T10:30:00Z' },
            ],
        };

        const result = extractRegistrationDate(rdapJson);
        expect(result).toBeInstanceOf(Date);
        expect(result!.toISOString()).toBe('2023-01-15T10:30:00.000Z');
    });

    it('should handle deeply nested object structures', () => {
        const rdapJson = {
            some: { nested: { structure: true } },
            events: [
                {
                    eventAction: 'registration',
                    eventDate: '2023-01-15T10:30:00Z',
                    extra: { data: 'value' },
                },
            ],
            other: [1, 2, 3],
        };

        const result = extractRegistrationDate(rdapJson);
        expect(result).toBeInstanceOf(Date);
        expect(result!.toISOString()).toBe('2023-01-15T10:30:00.000Z');
    });

    it('should trim and normalize eventAction with spaces', () => {
        const rdapJson = {
            events: [{ eventAction: '  registration  ', eventDate: '2023-01-15T10:30:00Z' }],
        };

        const result = extractRegistrationDate(rdapJson);
        expect(result).toBeInstanceOf(Date);
    });
});

if (typeof global.fetch === 'undefined') {
    global.fetch = vi.fn();
}

if (typeof global.AbortController === 'undefined') {
    global.AbortController = vi.fn(createMockAbortController) as typeof AbortController;
}

describe('fetchRdapJson', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    describe('fetchRdapJson', () => {
        const originalFetch = global.fetch;

        beforeEach(() => {
            vi.useFakeTimers();
            global.fetch = vi.fn();
        });

        afterEach(() => {
            vi.useRealTimers();
            global.fetch = originalFetch;
            vi.restoreAllMocks();
        });

        describe('successful responses', () => {
            it('should return success response for 200 OK with JSON', async () => {
                const mockJson = { events: [{ eventAction: 'registration' }] };
                const mockResponse = {
                    ok: true,
                    status: 200,
                    json: vi.fn().mockResolvedValue(mockJson),
                };

                (global.fetch as Mock).mockResolvedValue(mockResponse);

                const resultPromise = fetchRdapJson('https://example.com/rdap');
                await vi.advanceTimersByTimeAsync(0); // Allow promises to settle
                const result = await resultPromise;

                expect(result).toEqual({
                    ok: true,
                    status: 200,
                    json: mockJson,
                });
                expect(global.fetch).toHaveBeenCalledWith('https://example.com/rdap', {
                    signal: expect.any(AbortSignal),
                    headers: { accept: 'application/rdap+json, application/json' },
                });
            });

            it('should handle different successful status codes', async () => {
                const statusCodes = [200, 201, 202];

                for (const status of statusCodes) {
                    const mockResponse = {
                        ok: true,
                        status,
                        json: vi.fn().mockResolvedValue({ data: 'test' }),
                    };
                    (global.fetch as Mock).mockResolvedValue(mockResponse);

                    const result = await fetchRdapJson('https://example.com/rdap');

                    expect(result.ok).toBe(true);
                    expect(result.status).toBe(status);
                    expect((result as SuccessResponse).json).toEqual({ data: 'test' });
                }
            });

            it('should parse JSON response correctly', async () => {
                const complexJson = {
                    events: [
                        { eventAction: 'registration', eventDate: '2023-01-01' },
                        { eventAction: 'expiration', eventDate: '2024-01-01' },
                    ],
                    handle: 'DOMAIN-123',
                    status: ['active'],
                };

                const mockResponse = {
                    ok: true,
                    status: 200,
                    json: vi.fn().mockResolvedValue(complexJson),
                };
                (global.fetch as Mock).mockResolvedValue(mockResponse);

                const result = await fetchRdapJson('https://example.com/rdap');

                expect(result.ok).toBe(true);
                expect((result as SuccessResponse).json).toEqual(complexJson);
            });
        });

        describe('error responses', () => {
            it('should return error response for non-ok response', async () => {
                const mockResponse = {
                    ok: false,
                    status: 404,
                    json: vi.fn().mockResolvedValue({ error: 'Not found' }),
                };
                (global.fetch as Mock).mockResolvedValue(mockResponse);

                const result = await fetchRdapJson('https://example.com/rdap');

                expect(result).toEqual({
                    ok: false,
                    status: 404,
                });
                expect(mockResponse.json).not.toHaveBeenCalled();
            });

            it('should handle various error status codes', async () => {
                const errorCodes = [400, 401, 403, 404, 429, 500, 502, 503];

                for (const status of errorCodes) {
                    const mockResponse = {
                        ok: false,
                        status,
                        json: vi.fn(),
                    };
                    (global.fetch as Mock).mockResolvedValue(mockResponse);

                    const result = await fetchRdapJson('https://example.com/rdap');

                    expect(result.ok).toBe(false);
                    expect(result.status).toBe(status);
                    expect(mockResponse.json).not.toHaveBeenCalled();
                }
            });
        });

        describe('network/timeout errors', () => {
            it('should handle fetch network error', async () => {
                (global.fetch as Mock).mockRejectedValue(new Error('Network error'));

                const result = await fetchRdapJson('https://example.com/rdap');

                expect(result).toEqual({
                    ok: false,
                    status: 0,
                });
            });

            it('should handle timeout', async () => {
                vi.stubGlobal(
                    'AbortController',
                    class {
                        private _aborted = false;

                        signal: AbortSignal = {
                            get aborted() {
                                return this.aborted;
                            },
                            onabort: null as ((this: AbortSignal, ev: Event) => void) | null,
                            reason: undefined,
                            throwIfAborted: vi.fn(),
                            addEventListener: vi.fn(),
                            removeEventListener: vi.fn(),
                            dispatchEvent: vi.fn(),
                        } as AbortSignal;

                        abort = vi.fn(() => {
                            this._aborted = true;
                            if (this.signal.onabort) {
                                this.signal.onabort.call(this.signal, new Event('abort'));
                            }
                        });
                    }
                );

                // Mock fetch să reject cu AbortError
                (global.fetch as Mock).mockRejectedValue(new DOMException('Aborted', 'AbortError'));

                const result = await fetchRdapJson('https://example.com/rdap', 100);

                expect(result).toEqual({
                    ok: false,
                    status: 0,
                });
            });

            it('should handle JSON parsing error', async () => {
                const mockResponse = {
                    ok: true,
                    status: 200,
                    json: vi.fn().mockRejectedValue(new SyntaxError('Invalid JSON')),
                };
                (global.fetch as Mock).mockResolvedValue(mockResponse);

                const result = await fetchRdapJson('https://example.com/rdap');

                expect(result).toEqual({
                    ok: false,
                    status: 0,
                });
            });

            it('should handle AbortError from timeout', async () => {
                const abortError = new DOMException('The operation was aborted.', 'AbortError');
                (global.fetch as Mock).mockRejectedValue(abortError);

                const result = await fetchRdapJson('https://example.com/rdap');

                expect(result).toEqual({
                    ok: false,
                    status: 0,
                });
            });

            it('should handle any other exception', async () => {
                (global.fetch as Mock).mockRejectedValue(new TypeError('Invalid URL'));

                const result = await fetchRdapJson('https://example.com/rdap');

                expect(result).toEqual({
                    ok: false,
                    status: 0,
                });
            });
        });

        describe('timeout behavior', () => {
            it('should use default timeout of 8000ms', async () => {
                const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

                const mockResponse = {
                    ok: true,
                    status: 200,
                    json: vi.fn().mockResolvedValue({}),
                };
                (global.fetch as Mock).mockResolvedValue(mockResponse);

                await fetchRdapJson('https://example.com/rdap');

                expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 8000);

                const callArgs = (global.fetch as Mock).mock.calls[0];
                expect(callArgs[1].signal).toBeInstanceOf(AbortSignal);

                setTimeoutSpy.mockRestore();
            });

            it('should handle timeout correctly', async () => {
                vi.stubGlobal(
                    'AbortController',
                    class {
                    }
                );

                // Mock fetch să reject cu AbortError (simulând timeout)
                (global.fetch as Mock).mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError'));

                const result = await fetchRdapJson('https://example.com/rdap', 500);

                expect(result).toEqual({ ok: false, status: 0 });
            });

            it('should clear timeout on successful response', async () => {
                const mockResponse = {
                    ok: true,
                    status: 200,
                    json: vi.fn().mockResolvedValue({}),
                };
                (global.fetch as Mock).mockResolvedValue(mockResponse);

                const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

                await fetchRdapJson('https://example.com/rdap', 10000);

                expect(clearTimeoutSpy).toHaveBeenCalled();
            });

            it('should clear timeout on error response', async () => {
                const mockResponse = {
                    ok: false,
                    status: 404,
                    json: vi.fn(),
                };
                (global.fetch as Mock).mockResolvedValue(mockResponse);

                const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

                await fetchRdapJson('https://example.com/rdap', 10000);

                expect(clearTimeoutSpy).toHaveBeenCalled();
            });

            it('should clear timeout on exception', async () => {
                (global.fetch as Mock).mockRejectedValue(new Error('Network error'));

                const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

                await fetchRdapJson('https://example.com/rdap', 10000);

                expect(clearTimeoutSpy).toHaveBeenCalled();
            });
        });

        describe('headers', () => {
            it('should send correct accept headers', async () => {
                const mockResponse = {
                    ok: true,
                    status: 200,
                    json: vi.fn().mockResolvedValue({}),
                };
                (global.fetch as Mock).mockResolvedValue(mockResponse);

                await fetchRdapJson('https://example.com/rdap');

                expect(global.fetch).toHaveBeenCalledWith(
                    'https://example.com/rdap',
                    expect.objectContaining({
                        headers: { accept: 'application/rdap+json, application/json' },
                    })
                );
            });

            it('should not send other headers', async () => {
                const mockResponse = {
                    ok: true,
                    status: 200,
                    json: vi.fn().mockResolvedValue({}),
                };
                (global.fetch as Mock).mockResolvedValue(mockResponse);

                await fetchRdapJson('https://example.com/rdap');

                const callArgs = (global.fetch as Mock).mock.calls[0];
                const headers = callArgs[1].headers;

                expect(Object.keys(headers)).toEqual(['accept']);
                expect(headers.accept).toBe('application/rdap+json, application/json');
            });
        });

        describe('AbortSignal integration', () => {
            it('should create new AbortSignal for each call', async () => {
                const mockResponse = {
                    ok: true,
                    status: 200,
                    json: vi.fn().mockResolvedValue({}),
                };
                (global.fetch as Mock).mockResolvedValue(mockResponse);

                await fetchRdapJson('https://example.com/rdap');
                await fetchRdapJson('https://example.com/rdap2');

                const calls = (global.fetch as Mock).mock.calls;
                expect(calls).toHaveLength(2);

                const signal1 = calls[0][1].signal;
                const signal2 = calls[1][1].signal;
                expect(signal1).not.toBe(signal2);
            });

            it('should abort request after timeout', async () => {
                let timeoutCallback: () => void;
                const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback: () => void) => {
                    timeoutCallback = callback;
                    return 123 as unknown as NodeJS.Timeout;
                });

                // Mock AbortController
                const mockAbort = vi.fn();
                vi.stubGlobal(
                    'AbortController',
                    class {
                        abort = mockAbort;
                        signal = { aborted: false };
                    }
                );

                // Mock fetch
                (global.fetch as Mock).mockResolvedValue({
                    ok: true,
                    status: 200,
                    json: vi.fn().mockResolvedValue({}),
                });

                fetchRdapJson('https://example.com/rdap', 100);
                timeoutCallback!();
                expect(mockAbort).toHaveBeenCalled();
                setTimeoutSpy.mockRestore();
            });
        });
    });
});
