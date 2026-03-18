import { describe, expect, it } from 'vitest';

import { LoginSchema } from '@/validation/LoginSchema';

const validInput = {
    email: 'jane@example.com',
    password: 'Strong_Ab',
};

describe('LoginSchema', () => {
    it('accepts valid login payload', () => {
        const result = LoginSchema.safeParse(validInput);

        expect(result.success).toBe(true);
    });

    it('Rejects invalid email format', () => {
        const result = LoginSchema.safeParse({
            ...validInput,
            email: 'invalid-email',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(['email']);
            expect(result.error.issues[0]?.message).toBe('Invalid email address');
        }
    });

    it('Rejects password shorter than 8 characters', () => {
        const result = LoginSchema.safeParse({
            ...validInput,
            password: 'Aa_1',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(['password']);
            expect(result.error.issues[0]?.message).toBe('Password must be at least 8 characters long');
        }
    });

    it('Rejects password without lowercase letters', () => {
        const result = LoginSchema.safeParse({
            ...validInput,
            password: 'STRONG_A',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.map((issue) => issue.message)).toContain(
                'Password must contain at least one lowercase letter'
            );
        }
    });

    it('Rejects password without uppercase letters', () => {
        const result = LoginSchema.safeParse({
            ...validInput,
            password: 'strong_a',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.map((issue) => issue.message)).toContain(
                'Password must contain at least one uppercase letter'
            );
        }
    });

    it('Rejects password without required special characters', () => {
        const result = LoginSchema.safeParse({
            ...validInput,
            password: 'StrongPass',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.map((issue) => issue.message)).toContain(
                'Password must contain at least one special character (!@#_)'
            );
        }
    });
});
