import { describe, expect, it } from 'vitest';

import { ForgotPasswordSchema } from '@/validation/ForgotPasswordSchema';

const validInput = {
    email: 'jane@example.com',
};

describe('ForgotPasswordSchema', () => {
    it('Accepts valid forgot-password payload', () => {
        const result = ForgotPasswordSchema.safeParse(validInput);

        expect(result.success).toBe(true);
    });

    it('Rejects invalid email format', () => {
        const result = ForgotPasswordSchema.safeParse({
            ...validInput,
            email: 'invalid-email',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(['email']);
            expect(result.error.issues[0]?.message).toBe('Invalid email address');
        }
    });

    it('Rejects empty email', () => {
        const result = ForgotPasswordSchema.safeParse({
            ...validInput,
            email: '',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(['email']);
            expect(result.error.issues[0]?.message).toBe('Invalid email address');
        }
    });
});
