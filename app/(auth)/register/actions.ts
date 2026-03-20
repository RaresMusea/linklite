'use server';

import { RegisterSchema, RegistrationInput } from '@/validation/RegisterSchema';
import { auth } from '@/lib/auth/auth';
import { logger } from '@/lib/logging/logger';
import { AuthActionResult, validateAuthActionInput } from '@/lib/server/action_utils';

const registrationLogger = logger.component('auth.register.register-server').child(undefined, ['auth', 'register']);

export type RegistrationResult = AuthActionResult<RegistrationInput>;

export async function signUp(input: RegistrationInput): Promise<RegistrationResult> {
    const parsedInput = validateAuthActionInput(RegisterSchema, input);

    if (!parsedInput.success) {
        return parsedInput;
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
