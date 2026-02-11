import { AppError } from '@/lib/errors/AppError';
import { ReadinessReason } from '@/lib/errors/types';

export class ReadinessError extends AppError {
    constructor(
        public readonly reason: ReadinessReason,
        message: string,
        public readonly details?: Record<string, unknown>
    ) {
        super(`readiness:${reason}_error`, message, 503, true);
    }
}
