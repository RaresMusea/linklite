'use server';

import { z } from 'zod';
import { RegisterSchema, RegistrationInput } from '@/validation/RegisterSchema';
import { auth } from '@/lib/auth/auth';
import { logger } from '@/lib/logging/logger';

const registrationLogger = logger.component('auth.register.register-server').child(undefined, ['auth', 'register']);

export type RegistrationResult =
    | {
          success: true;
          message: string;
      }
    | {
          success: false;
          fieldErrors?: Partial<Record<keyof RegistrationInput, string[]>>;
          formError?: string;
      };

export async function register(input: RegistrationInput): Promise<RegistrationResult> {
    const parsedInput = RegisterSchema.safeParse(input);

    if (!parsedInput.success) {
        const tree = z.treeifyError(parsedInput.error);

        return {
            success: false,
            fieldErrors: Object.fromEntries(
                Object.entries(tree.properties ?? {}).map(([key, value]) => [key, value?.errors ?? []])
            ) as Partial<Record<keyof RegistrationInput, string[]>>,
        };
    }

    const { name, email, password } = parsedInput.data;

    try {
        const normalizedEmail = email.trim().toLowerCase();

        await auth.api.signUpEmail({
            body: {
                name: name.trim(),
                email: normalizedEmail,
                password,
            },
        });

        registrationLogger.info(`User ${name} joined LinkLite.`);

        return {
            success: true,
            message: `Registration successful! A confirmation email was sent to ${normalizedEmail}. Please check your email.`,
        };
    } catch (error) {
        registrationLogger.error(`Failed to register user ${name}.`, { error });
        return {
            success: false,
            formError: 'Failed to register. Please try again later.',
        };
    }
}