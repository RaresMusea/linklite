import { describe, expect, it } from 'vitest';

import { RegisterSchema } from '@/validation/RegisterSchema';

const validInput = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'Strong_Ab',
    confirmPassword: 'Strong_Ab',
    terms: true,
};

describe('RegisterSchema', () => {
    it('accepts valid registration payload', () => {
        const result = RegisterSchema.safeParse(validInput);

        expect(result.success).toBe(true);
    });

    it('rejects name shorter than 2 characters', () => {
        const result = RegisterSchema.safeParse({
            ...validInput,
            name: 'J',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(['name']);
            expect(result.error.issues[0]?.message).toBe('Name is too short');
        }
    });

    it('rejects invalid email format', () => {
        const result = RegisterSchema.safeParse({
            ...validInput,
            email: 'invalid-email',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(['email']);
            expect(result.error.issues[0]?.message).toBe('Invalid email address');
        }
    });

    it('rejects password shorter than 8 characters', () => {
        const result = RegisterSchema.safeParse({
            ...validInput,
            password: 'Aa_1',
            confirmPassword: 'Aa_1',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(['password']);
            expect(result.error.issues[0]?.message).toBe('Password must be at least 8 characters long');
        }
    });

    it('rejects password without lowercase letters', () => {
        const result = RegisterSchema.safeParse({
            ...validInput,
            password: 'STRONG_A',
            confirmPassword: 'STRONG_A',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.map((issue) => issue.message)).toContain(
                'Password must contain at least one lowercase letter'
            );
        }
    });

    it('rejects password without uppercase letters', () => {
        const result = RegisterSchema.safeParse({
            ...validInput,
            password: 'strong_a',
            confirmPassword: 'strong_a',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.map((issue) => issue.message)).toContain(
                'Password must contain at least one uppercase letter'
            );
        }
    });

    it('rejects password without required special characters', () => {
        const result = RegisterSchema.safeParse({
            ...validInput,
            password: 'StrongPass',
            confirmPassword: 'StrongPass',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.map((issue) => issue.message)).toContain(
                'Password must contain at least one special character (!@#_)'
            );
        }
    });

    it('rejects when passwords do not match', () => {
        const result = RegisterSchema.safeParse({
            ...validInput,
            confirmPassword: 'Different_Ab',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(['confirmPassword']);
            expect(result.error.issues[0]?.message).toBe('Passwords do not match');
        }
    });

    it('rejects when terms are not accepted', () => {
        const result = RegisterSchema.safeParse({
            ...validInput,
            terms: false,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(['terms']);
            expect(result.error.issues[0]?.message).toBe('You must accept the terms.');
        }
    });
});
