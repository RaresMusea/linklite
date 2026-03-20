import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { validateAuthActionInput } from '@/lib/server/action_utils';

describe('validateAuthActionInput', () => {
    it('returns parsed data when input is valid', () => {
        const schema = z.object({
            email: z.string().email(),
        });

        const result = validateAuthActionInput(schema, { email: 'jane@example.com' });

        expect(result.success).toBe(true);
        if (!result.success) return;

        expect(result.data).toEqual({ email: 'jane@example.com' });
    });

    it('Returns fieldErrors when input is invalid', () => {
        const schema = z.object({
            email: z.string().email(),
            password: z.string().min(8),
        });

        const result = validateAuthActionInput(schema, {
            email: 'not-an-email',
            password: 'short',
        });

        expect(result.success).toBe(false);
        if (result.success) return;

        expect(result.fieldErrors.email).toContain('Invalid email address');
        expect(result.fieldErrors.password?.[0]).toContain('8');
    });

    it('Returns empty fieldErrors for root-level refinement errors', () => {
        const schema = z
            .object({
                password: z.string().min(8),
                confirmPassword: z.string().min(8),
            })
            .refine((value) => value.password === value.confirmPassword, {
                message: 'Passwords must match',
            });

        const result = validateAuthActionInput(schema, {
            password: 'Strong_Ab',
            confirmPassword: 'Strong_Xy',
        });

        expect(result.success).toBe(false);
        if (result.success) return;

        expect(result.fieldErrors).toEqual({});
    });
});
