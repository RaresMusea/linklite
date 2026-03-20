'use server';

import { logger } from '@/lib/logging/logger';
import { auth } from '@/lib/auth/auth';
import { LoginInput, LoginSchema } from '@/validation/LoginSchema';
import { AuthActionResult, validateAuthActionInput } from '@/lib/server/action_utils';

const loginLogger = logger.component('auth.login.login-server').child(undefined, ['auth', 'login']);

export type LoginResult = AuthActionResult<LoginInput>;

export async function signIn(input: LoginInput): Promise<LoginResult> {
    const parsedInput = validateAuthActionInput(LoginSchema, input);

    if (!parsedInput.success) {
        return parsedInput;
    }

    const { email, password } = parsedInput.data;
    const normalizedEmail = email.trim().toLowerCase();

    try {
        await auth.api.signInEmail({
            body: {
                email: normalizedEmail,
                password,
            },
        });

        loginLogger.info(`User ${normalizedEmail} signed in.`);

        return {
            success: true,
            message: 'Signed in successfully.',
        };
    } catch (error) {
        loginLogger.error(`Failed sign in for ${normalizedEmail}.`, { cause: error });
        return {
            success: false,
            formError: 'Unable to sign in. Please check your credentials and try again.',
        };
    }
}
