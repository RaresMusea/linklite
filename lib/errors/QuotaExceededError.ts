import { AppError } from '@/lib/errors/AppError';

export class QuotaExceededError extends AppError {
  constructor(limit?: number) {
    super(
      'QUOTA_EXCEEDED',
      limit
        ? `You've reached the anonymous limit of ${limit} links. Sign up for free to create more short links.`
        : "You've reached the anonymous limit. Sign up for free to create more short links.",
      429,
      true
    );
  }
}