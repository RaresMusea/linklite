export interface ErrorWithCode extends Error {
    code?: number | string;
}

export type ReadinessReason = 'database' | 'migrations' | 'timeout';