'use server';

import { auth } from '@/lib/auth/auth';
import { logger } from '@/lib/logging/logger';
import { ResetPasswordInput, ResetPasswordSchema } from '@/validation/ResetPasswordSchema';
import { AuthActionResult, validateAuthActionInput } from '@/lib/server/action_utils';

const resetPasswordLogger = logger
    .component('auth.password-reset.complete-server')
    .child(undefined, ['auth', 'password-reset']);

export type ResetPasswordResult = AuthActionResult<ResetPasswordInput>;

export async function completeResetPassword(input: ResetPasswordInput): Promise<ResetPasswordResult> {
    const parsedInput = validateAuthActionInput(ResetPasswordSchema, input);

    if (!parsedInput.success) {
        return parsedInput;
    }

    const { token, newPassword } = parsedInput.data;

    try {
        await auth.api.resetPassword({
            body: {
                token,
                newPassword,
            },
        });

        resetPasswordLogger.info('Password reset was completed successfully.');

        return {
            success: true,
            message: 'Password updated successfully. You can sign in now.',
        };
    } catch (error) {
        resetPasswordLogger.error('Failed to complete password reset.', { cause: error });

        return {
            success: false,
            formError: 'Unable to reset password. This link may be invalid or expired.',
        };
    }
}
