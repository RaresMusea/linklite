import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerLogger } from '@/lib/logging/logger';

const ORIGINAL_LOG_LEVEL = process.env.LOG_LEVEL;

type LogPayload = Record<string, unknown> & {
    level?: string;
    tags?: string[];
    component?: string;
    err?: {
        name?: string;
        message?: string;
        stack?: string;
    };
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePayload(call: unknown[]): LogPayload {
    const parsed = JSON.parse(String(call[0])) as unknown;
    return isRecord(parsed) ? (parsed as LogPayload) : ({} as LogPayload);
}

function restoreLogLevel() {
    if (ORIGINAL_LOG_LEVEL === undefined) {
        delete process.env.LOG_LEVEL;
    } else {
        process.env.LOG_LEVEL = ORIGINAL_LOG_LEVEL;
    }
}

describe('Logger tests', () => {
    let logSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        logSpy.mockRestore();
        restoreLogLevel();
        vi.useRealTimers();
    });

    it('Respects LOG_LEVEL from env when level is not provided', () => {
        process.env.LOG_LEVEL = 'warn';

        const logger = new ServerLogger({ useColors: false });
        logger.debug('debug');
        logger.info('info');
        logger.warn('warn');
        logger.error('error');

        expect(logSpy).toHaveBeenCalledTimes(2);
        const payloads: LogPayload[] = logSpy.mock.calls.map((call: unknown[]) => parsePayload(call));
        expect(payloads.map((payload: LogPayload) => payload.level)).toEqual(['WARN', 'ERROR']);
    });

    it('Falls back to INFO when LOG_LEVEL is invalid', () => {
        process.env.LOG_LEVEL = 'nope';

        const logger = new ServerLogger({ useColors: false });
        logger.debug('debug');
        logger.info('info');

        expect(logSpy).toHaveBeenCalledTimes(1);
        const payload = parsePayload(logSpy.mock.calls[0]);
        expect(payload.level).toBe('INFO');
    });

    it('Merges meta and tags from base, child, and call', () => {
        const logger = new ServerLogger({ useColors: false, meta: { base: 1 }, tags: ['base'] });
        const child = logger.child({ child: 2 }, ['child']);

        child.info('hello', { call: 3 }, ['call']);

        const payload = parsePayload(logSpy.mock.calls[0]);
        expect(payload.tags).toEqual(['base', 'child', 'call']);
        expect(payload.base).toBe(1);
        expect(payload.child).toBe(2);
        expect(payload.call).toBe(3);
    });

    it('Serializes Error values in meta', () => {
        const logger = new ServerLogger({ useColors: false });
        const err = new Error('boom');

        logger.error('oops', { err });

        const payload = parsePayload(logSpy.mock.calls[0]);
        expect(payload.err).toMatchObject({
            name: 'Error',
            message: 'boom',
        });
        expect(typeof payload.err?.stack).toBe('string');
    });

    it('Chains component meta', () => {
        const logger = new ServerLogger({ useColors: false, meta: { component: 'api' } });
        const scoped = logger.component('db');

        scoped.info('hello');

        const payload = parsePayload(logSpy.mock.calls[0]);
        expect(payload.component).toBe('api.db');
    });

    it('Formats color output with tags and pretty meta', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2020-01-02T03:04:05.000Z'));

        const logger = new ServerLogger({ useColors: true });
        logger.info('hello', { x: 1 }, ['tag1']);

        expect(logSpy).toHaveBeenCalledTimes(1);
        const line = String(logSpy.mock.calls[0][0]);
        expect(line).toContain('\x1b[32m');
        expect(line).toContain('[2020-01-02T03:04:05.000Z] [INFO] [tag1] hello');
        expect(line).toContain('\x1b[0m');
        expect(line).toContain('\n  {\n    "x": 1\n  }');
    });
});
