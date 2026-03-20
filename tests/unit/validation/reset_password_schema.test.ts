import { describe, expect, it } from 'vitest';

import { ResetPasswordSchema } from '@/validation/ResetPasswordSchema';

const validInput = {
    token: 'reset-token-123',
    newPassword: 'Strong_Ab',
    confirmPassword: 'Strong_Ab',
};

describe('ResetPasswordSchema', () => {
    it('Accepts valid reset-password payload', () => {
        const result = ResetPasswordSchema.safeParse(validInput);

        expect(result.success).toBe(true);
    });

    it('Rejects empty reset token', () => {
        const result = ResetPasswordSchema.safeParse({
            ...validInput,
            token: '',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(['token']);
            expect(result.error.issues[0]?.message).toBe('Invalid reset token');
        }
    });

    it('Rejects password shorter than 8 characters', () => {
        const result = ResetPasswordSchema.safeParse({
            ...validInput,
            newPassword: 'Aa_1',
            confirmPassword: 'Aa_1',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(['newPassword']);
            expect(result.error.issues[0]?.message).toBe('Password must be at least 8 characters long');
        }
    });

    it('Rejects password without lowercase letters', () => {
        const result = ResetPasswordSchema.safeParse({
            ...validInput,
            newPassword: 'STRONG_A',
            confirmPassword: 'STRONG_A',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.map((issue) => issue.message)).toContain(
                'Password must contain at least one lowercase letter'
            );
        }
    });

    it('Rejects password without uppercase letters', () => {
        const result = ResetPasswordSchema.safeParse({
            ...validInput,
            newPassword: 'strong_a',
            confirmPassword: 'strong_a',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.map((issue) => issue.message)).toContain(
                'Password must contain at least one uppercase letter'
            );
        }
    });

    it('Rejects password without required special characters', () => {
        const result = ResetPasswordSchema.safeParse({
            ...validInput,
            newPassword: 'StrongPass',
            confirmPassword: 'StrongPass',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.map((issue) => issue.message)).toContain(
                'Password must contain at least one special character (!@#_)'
            );
        }
    });

    it('Rejects when passwords do not match', () => {
        const result = ResetPasswordSchema.safeParse({
            ...validInput,
            confirmPassword: 'Different_Ab',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(['confirmPassword']);
            expect(result.error.issues[0]?.message).toBe('Passwords do not match');
        }
    });
});
