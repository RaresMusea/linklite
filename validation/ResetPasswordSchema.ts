import { z } from 'zod';

export const ResetPasswordSchema = z
    .object({
        token: z.string().min(1, 'Invalid reset token'),
        newPassword: z
            .string()
            .min(8, 'Password must be at least 8 characters long')
            .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/[!@#_]/, 'Password must contain at least one special character (!@#_)'),
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
