'use server';

import { auth } from '@/lib/auth/auth';
import { logger } from '@/lib/logging/logger';
import { ForgotPasswordInput, ForgotPasswordSchema } from '@/validation/ForgotPasswordSchema';
import { AuthActionResult, validateAuthActionInput } from '@/lib/server/action_utils';

const forgotPasswordLogger = logger.component('auth.password-reset.request-server').child(undefined, [
    'auth',
    'password-reset',
]);

export type ForgotPasswordResult = AuthActionResult<ForgotPasswordInput>;

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<ForgotPasswordResult> {
    const parsedInput = validateAuthActionInput(ForgotPasswordSchema, input);

    if (!parsedInput.success) {
        return parsedInput;
    }

    const normalizedEmail = parsedInput.data.email.trim().toLowerCase();
    const redirectBase = (process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(
        /\/$/,
        '',
    );

    try {
        const result = await auth.api.requestPasswordReset({
            body: {
                email: normalizedEmail,
                redirectTo: `${redirectBase}/reset-password`,
            },
        });

        forgotPasswordLogger.info(`Password reset requested for ${normalizedEmail}.`);

        return {
            success: true,
            message: result.message,
        };
    } catch (error) {
        forgotPasswordLogger.error(`Failed password reset request for ${normalizedEmail}.`, { cause: error });

        return {
            success: false,
            formError: 'Unable to request a password reset right now. Please try again.',
        };
    }
}
