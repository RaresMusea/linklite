import { AppError } from '@/lib/errors/AppError';

export class InvalidHostnameError extends AppError {
    constructor() {
        super('INVALID_HOSTNAME', 'The provided URL does not contain a valid hostname.', 400);
    }
}
