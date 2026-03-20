import { z } from 'zod';

export const ForgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
