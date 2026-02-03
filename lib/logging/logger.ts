import { LogLevel, LogMeta } from '@/lib/logging/logger.types';

function parseLogLevel(value: string | undefined, fallback: LogLevel): LogLevel {
    switch ((value ?? '').toLowerCase()) {
        case 'debug':
            return LogLevel.DEBUG;
        case 'info':
            return LogLevel.INFO;
        case 'warn':
        case 'warning':
            return LogLevel.WARN;
        case 'error':
            return LogLevel.ERROR;
        default:
            return fallback;
    }
}

type LoggerOpts<M extends LogMeta> = {
    level?: LogLevel;
    useColors?: boolean;
    meta?: M;
    tags?: string[];
};

export class ServerLogger<M extends LogMeta = LogMeta> {
    private readonly currentLogLevel: LogLevel;
    private readonly useColors: boolean;

    private readonly baseMeta: M;
    private readonly baseTags: string[];

    constructor(opts?: LoggerOpts<M>) {
        this.currentLogLevel = opts?.level ?? parseLogLevel(process.env.LOG_LEVEL, LogLevel.INFO);
        this.useColors = opts?.useColors ?? Boolean(process.stdout.isTTY);

        this.baseMeta = opts?.meta ?? ({} as M);
        this.baseTags = opts?.tags ?? [];
    }

    child<N extends LogMeta>(meta?: N, tags?: string[]): ServerLogger<M & N> {
        return new ServerLogger<M & N>({
            level: this.currentLogLevel,
            useColors: this.useColors,
            meta: { ...this.baseMeta, ...(meta ?? {}) } as M & N,
            tags: [...this.baseTags, ...(tags ?? [])],
        });
    }

    with<N extends LogMeta>(meta: N, tags?: string[]): ServerLogger<M & N> {
        return this.child(meta, tags);
    }

    component(path: string): ServerLogger<M & { component: string }> {
        const prev = (this.baseMeta as Partial<{ component: unknown }>).component;
        const prevStr = typeof prev === 'string' ? prev : undefined;

        const next = prevStr
            ? prevStr === path || prevStr.endsWith(`.${path}`)
                ? prevStr
                : `${prevStr}.${path}`
            : path;
        return this.child({ component: next } as { component: string });
    }

    private levelName(level: LogLevel): string {
        return LogLevel[level];
    }

    private color(level: LogLevel): string {
        if (!this.useColors) return '';
        switch (level) {
            case LogLevel.DEBUG:
                return '\x1b[34m';
            case LogLevel.INFO:
                return '\x1b[32m';
            case LogLevel.WARN:
                return '\x1b[33m';
            case LogLevel.ERROR:
                return '\x1b[31m';
        }
    }

    private reset(): string {
        return this.useColors ? '\x1b[0m' : '';
    }

    private normalizeMeta(meta: LogMeta): unknown {
        try {
            return JSON.parse(
                JSON.stringify(meta, (_, value) => {
                    if (value instanceof Error) {
                        return {
                            name: value.name,
                            message: value.message,
                            stack: value.stack,
                        };
                    }
                    return value;
                })
            );
        } catch {
            return '[unserializable meta]';
        }
    }

    private formatMetaPretty(meta: LogMeta): string {
        try {
            return JSON.stringify(
                meta,
                (_, value) => {
                    if (value instanceof Error) {
                        return {
                            name: value.name,
                            message: value.message,
                            stack: value.stack,
                        };
                    }
                    return value;
                },
                2
            );
        } catch {
            return '[unserializable meta]';
        }
    }

    private write(level: LogLevel, message: string, meta?: LogMeta, tags?: string[]): void {
        if (level < this.currentLogLevel) return;

        const timestamp = new Date().toISOString();
        const levelName = this.levelName(level);

        const mergedTags = [...this.baseTags, ...(tags ?? [])];
        const mergedMeta = { ...this.baseMeta, ...(meta ?? {}) };

        // If you want: treat empty tags as undefined
        const tagsOut = mergedTags.length ? mergedTags : undefined;

        if (this.useColors) {
            const c = this.color(level);
            const tagStr = tagsOut?.length ? ` [${tagsOut.join(',')}]` : '';

            let metaStr = '';
            const hasMeta = mergedMeta && Object.keys(mergedMeta).length > 0;
            if (hasMeta) {
                metaStr =
                    '\n' +
                    this.formatMetaPretty(mergedMeta)
                        .split('\n')
                        .map((line) => `  ${line}`)
                        .join('\n');
            }

            console.log(`${c}[${timestamp}] [${levelName}]${tagStr} ${message}${this.reset()}${metaStr}`);
            return;
        }

        // prod: JSON friendly
        const payload = {
            timestamp,
            level: levelName,
            message,
            ...(tagsOut ? { tags: tagsOut } : {}),
            ...(mergedMeta ? (this.normalizeMeta(mergedMeta) as object) : {}),
        };

        console.log(JSON.stringify(payload));
    }

    debug(message: string, meta?: LogMeta, tags?: string[]) {
        this.write(LogLevel.DEBUG, message, meta, tags);
    }
    info(message: string, meta?: LogMeta, tags?: string[]) {
        this.write(LogLevel.INFO, message, meta, tags);
    }
    warn(message: string, meta?: LogMeta, tags?: string[]) {
        this.write(LogLevel.WARN, message, meta, tags);
    }
    error(message: string, meta?: LogMeta, tags?: string[]) {
        this.write(LogLevel.ERROR, message, meta, tags);
    }
}

// Example: default singleton
export const logger = new ServerLogger({
    level: parseLogLevel(process.env.LOG_LEVEL, LogLevel.INFO),
    useColors: process.env.NODE_ENV !== 'production',
});
