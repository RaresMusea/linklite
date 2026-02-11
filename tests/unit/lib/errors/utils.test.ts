import { describe, it, expect } from 'vitest';
import { extractErrorCode, extractErrorMessage, normalizeError } from '@/lib/errors/utils';

describe('extractErrorMessage', () => {
    it('should return error message for Error instance', () => {
        const error = new Error('Database connection failed');
        const result = extractErrorMessage(error);
        expect(result).toBe('Database connection failed');
    });

    it('should return string value for string input', () => {
        const result = extractErrorMessage('Network timeout');
        expect(result).toBe('Network timeout');
    });

    it('should return default message for null', () => {
        const result = extractErrorMessage(null);
        expect(result).toBe('WHOIS failed');
    });

    it('should return default message for undefined', () => {
        const result = extractErrorMessage(undefined);
        expect(result).toBe('WHOIS failed');
    });

    it('should return default message for number input', () => {
        const result = extractErrorMessage(404);
        expect(result).toBe('WHOIS failed');
    });

    it('should return default message for boolean input', () => {
        const result = extractErrorMessage(true);
        expect(result).toBe('WHOIS failed');
    });

    it('should return default message for object without message property', () => {
        const result = extractErrorMessage({ foo: 'bar' });
        expect(result).toBe('WHOIS failed');
    });

    it('should return default message for array input', () => {
        const result = extractErrorMessage([1, 2, 3]);
        expect(result).toBe('WHOIS failed');
    });

    it('should handle Error subclasses', () => {
        class CustomError extends Error {
            constructor(message: string) {
                super(message);
                this.name = 'CustomError';
            }
        }

        const error = new CustomError('Custom error occurred');
        const result = extractErrorMessage(error);
        expect(result).toBe('Custom error occurred');
    });

    it('should handle Error with empty message', () => {
        const error = new Error('');
        const result = extractErrorMessage(error);
        expect(result).toBe('');
    });

    it('should handle string with whitespace only', () => {
        const result = extractErrorMessage('   ');
        expect(result).toBe('   ');
    });

    it('should handle empty string', () => {
        const result = extractErrorMessage('');
        expect(result).toBe('');
    });
});

describe('extractErrorCode', () => {
    it('should extract code from object with numeric code property', () => {
        const error = { code: 404 };
        const result = extractErrorCode(error);
        expect(result).toBe(404);
    });

    it('should return undefined for object with non-numeric code', () => {
        const testCases = [
            { code: '404' },
            { code: null },
            { code: undefined },
            { code: true },
            { code: {} },
            { code: [] },
        ];

        testCases.forEach((error) => {
            const result = extractErrorCode(error);
            expect(result).toBeUndefined();
        });
    });

    it('should return undefined for null input', () => {
        const result = extractErrorCode(null);
        expect(result).toBeUndefined();
    });

    it('should return undefined for undefined input', () => {
        const result = extractErrorCode(undefined);
        expect(result).toBeUndefined();
    });

    it('should return undefined for string input', () => {
        const result = extractErrorCode('error');
        expect(result).toBeUndefined();
    });

    it('should return undefined for number input', () => {
        const result = extractErrorCode(500);
        expect(result).toBeUndefined();
    });

    it('should return undefined for boolean input', () => {
        const result = extractErrorCode(true);
        expect(result).toBeUndefined();
    });

    it('should return undefined for array input', () => {
        const result = extractErrorCode([1, 2, 3]);
        expect(result).toBeUndefined();
    });

    it('should return undefined for object without code property', () => {
        const testCases = [{}, { message: 'error' }, { status: 404 }, { errorCode: 500 }];

        testCases.forEach((error) => {
            const result = extractErrorCode(error);
            expect(result).toBeUndefined();
        });
    });

    it('should handle object with additional properties', () => {
        const error = {
            code: 429,
            message: 'Rate limit exceeded',
            details: { retryAfter: 60 },
        };

        const result = extractErrorCode(error);
        expect(result).toBe(429);
    });

    it('should handle negative error codes', () => {
        const error = { code: -1 };
        const result = extractErrorCode(error);
        expect(result).toBe(-1);
    });

    it('should handle zero error code', () => {
        const error = { code: 0 };
        const result = extractErrorCode(error);
        expect(result).toBe(0);
    });

    it('should handle floating point error codes', () => {
        const error = { code: 3.14 };
        const result = extractErrorCode(error);
        expect(result).toBe(3.14);
    });

    it('should handle Infinity as error code', () => {
        const error = { code: Infinity };
        const result = extractErrorCode(error);
        expect(result).toBe(Infinity);
    });

    it('should handle NaN as error code', () => {
        const error = { code: NaN };
        const result = extractErrorCode(error);
        expect(result).toBe(NaN);
    });

    it('should handle object with code property inherited from prototype', () => {
        class ErrorWithCode extends Error {
            code: number;

            constructor(code: number) {
                super(`Error with code ${code}`);
                this.code = code;
            }
        }

        const error = new ErrorWithCode(503);
        const result = extractErrorCode(error);
        expect(result).toBe(503);
    });

    it('should handle object with getter for code property', () => {
        const error = {
            get code() {
                return 200;
            },
        };

        const result = extractErrorCode(error);
        expect(result).toBe(200);
    });
});

describe('combined usage examples', () => {
    it('should handle typical error object with both message and code', () => {
        const error: Error & { code?: number } = new Error('Database error');
        error.code = 1001;

        const message = extractErrorMessage(error);
        const code = extractErrorCode(error);

        expect(message).toBe('Database error');
        expect(code).toBe(1001);
    });

    it('should handle axios-like error object', () => {
        const error = {
            message: 'Request failed with status code 404',
            code: 'ENOTFOUND',
            response: {
                status: 404,
                data: { error: 'Not found' },
            },
        };

        const message = extractErrorMessage(error);
        const code = extractErrorCode(error); // 'ENOTFOUND' is string, so undefined

        expect(message).toBe('WHOIS failed'); // Not an Error instance and not a string
        expect(code).toBeUndefined();
    });

    it('should handle HTTP error object', () => {
        const error = {
            statusCode: 500,
            message: 'Internal server error',
            code: 500,
        };

        const message = extractErrorMessage(error);
        const code = extractErrorCode(error);

        expect(message).toBe('WHOIS failed');
        expect(code).toBe(500);
    });
});

describe('normalizeError', () => {
    it('should return the same Error instance', () => {
        const error = new Error('boom');
        const result = normalizeError(error);
        expect(result).toBe(error);
        expect(result.message).toBe('boom');
    });

    it('should wrap string values as Error', () => {
        const result = normalizeError('oops');
        expect(result).toBeInstanceOf(Error);
        expect(result.message).toBe('oops');
    });

    it('should stringify non-error objects', () => {
        const result = normalizeError({ reason: 'bad', code: 500 });
        expect(result).toBeInstanceOf(Error);
        expect(result.message).toBe(JSON.stringify({ reason: 'bad', code: 500 }));
    });

    it('should return Unknown error when object cannot be stringified', () => {
        const circular: Record<string, unknown> = {};
        circular.self = circular;

        const result = normalizeError(circular);
        expect(result).toBeInstanceOf(Error);
        expect(result.message).toBe('Unknown error');
    });
});
