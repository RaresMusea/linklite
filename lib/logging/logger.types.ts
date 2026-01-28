export enum LogLevel {
    DEBUG = 10,
    INFO = 20,
    WARN = 30,
    ERROR = 40,
}

export type LogMeta = Record<string, unknown>;

export interface LoggerLike {
    debug(msg: string, meta?: LogMeta): void;
    info(msg: string, meta?: LogMeta): void;
    warn(msg: string, meta?: LogMeta): void;
    error(msg: string, meta?: LogMeta): void;
}