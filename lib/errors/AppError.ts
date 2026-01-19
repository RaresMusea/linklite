export class AppError extends Error {
    constructor(
        public readonly code: string,
        message: string,
        public readonly status = 400,
        public readonly expose = true
    ) {
        super(message);
    }
}
