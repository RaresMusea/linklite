import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { getTreeifiedError } from '@/lib/zod/error_treeifier';

describe('Treeified error retriever tests', () => {
    it('Maps top-level schema field issues to fieldErrors', () => {
        const schema = z.object({
            email: z.email(),
            password: z.string().min(8),
        });

        const parsed = schema.safeParse({
            email: 'not-an-email',
            password: 'short',
        });

        expect(parsed.success).toBe(false);
        if (parsed.success) return;

        const result = getTreeifiedError(parsed);

        expect(result.success).toBe(false);
        expect(result.fieldErrors.email).toContain('Invalid email address');
        expect(result.fieldErrors.password?.[0]).toContain('8');
    });

    it('Returns empty fieldErrors for root-level issues with no property path', () => {
        const schema = z
            .object({
                password: z.string().min(8),
                confirmPassword: z.string().min(8),
            })
            .refine((value) => value.password === value.confirmPassword, {
                message: 'Passwords must match',
            });

        const parsed = schema.safeParse({
            password: 'Strong_Ab',
            confirmPassword: 'Strong_Xy',
        });

        expect(parsed.success).toBe(false);
        if (parsed.success) return;

        const result = getTreeifiedError(parsed);

        expect(result.success).toBe(false);
        expect(result.fieldErrors).toEqual({});
    });
});
