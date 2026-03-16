import { z } from 'zod';

export const LoginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[!@#_]/, 'Password must contain at least one special character (!@#_)')
});

export type LoginInput = z.infer<typeof LoginSchema>;
