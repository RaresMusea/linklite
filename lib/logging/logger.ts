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

export class ServerLogger {
    private readonly currentLogLevel: LogLevel;
    private readonly useColors: boolean;

    constructor(opts?: { level?: LogLevel; useColors?: boolean }) {
        this.currentLogLevel = opts?.level ?? parseLogLevel(process.env.LOG_LEVEL, LogLevel.INFO);
        this.useColors = opts?.useColors ?? Boolean(process.stdout.isTTY);
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

    private write(level: LogLevel, message: string, meta?: LogMeta, tags?: string[]): void {
        if (level < this.currentLogLevel) return;

        const timestamp = new Date().toISOString();
        const levelName = this.levelName(level);

        const payload = {
            timestamp,
            level: levelName,
            message,
            tags,
            ...meta,
        };

        if (this.useColors) {
            const c = this.color(level);
            const tagStr = tags?.length ? ` [${tags.join(',')}]` : '';

            let metaStr = '';
            if (meta) {
                metaStr =
                    '\n' +
                    this.formatMeta(meta)
                        .split('\n')
                        .map((line) => `  ${line}`)
                        .join('\n');
            }

            console.log(`${c}[${timestamp}] [${levelName}]${tagStr} ${message}${this.reset()}${metaStr}`);
            return;
        }

        // prod: JSON (CloudWatch / Loki / ELK friendly)
        console.log(JSON.stringify(payload));
    }

    private formatMeta(meta: LogMeta): string {
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
                2 // 👈 indent frumos
            );
        } catch {
            return '[unserializable meta]';
        }
    }

    debug(message: string, meta?: LogMeta) {
        this.write(LogLevel.DEBUG, message, meta);
    }
    info(message: string, meta?: LogMeta) {
        this.write(LogLevel.INFO, message, meta);
    }
    warn(message: string, meta?: LogMeta) {
        this.write(LogLevel.WARN, message, meta);
    }
    error(message: string, meta?: LogMeta) {
        this.write(LogLevel.ERROR, message, meta);
    }

    with(meta: LogMeta, tags?: string[]) {
        return {
            debug: (msg: string, m?: LogMeta) => this.write(LogLevel.DEBUG, msg, { ...meta, ...m }, tags),
            info: (msg: string, m?: LogMeta) => this.write(LogLevel.INFO, msg, { ...meta, ...m }, tags),
            warn: (msg: string, m?: LogMeta) => this.write(LogLevel.WARN, msg, { ...meta, ...m }, tags),
            error: (msg: string, m?: LogMeta) => this.write(LogLevel.ERROR, msg, { ...meta, ...m }, tags),
        };
    }
}

export const logger = new ServerLogger({ level: LogLevel.ERROR, useColors: true });
