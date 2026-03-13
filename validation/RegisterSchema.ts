import { z } from 'zod';

export const RegisterSchema = z
    .object({
        name: z.string().min(2, 'Name is too short').max(100),
        email: z.string().email('Invalid email address'),

        password: z
            .string()
            .min(8, 'Password must be at least 8 characters long')
            .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/[!@#_]/, 'Password must contain at least one special character (!@#_)'),

        confirmPassword: z.string(),

        terms: z.boolean().refine((value) => value, {
            message: 'You must accept the terms and the privacy policy.',
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

export type RegistrationInput = z.infer<typeof RegisterSchema>;
