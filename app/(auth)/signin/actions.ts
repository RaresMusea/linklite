import 'server-only';

import { logger } from '@/lib/logging/logger';
import { auth } from '@/lib/auth/auth';
import { LoginInput, LoginSchema } from '@/validation/LoginSchema';
import { getTreeifiedError } from '@/lib/zod/error_treeifier';

const loginLogger = logger.component('auth.login.login-server').child(undefined, ['auth', 'login']);

export type LoginResult =
    | {
          success: true;
          message: string;
      }
    | {
          success: false;
          fieldErrors?: Partial<Record<keyof LoginInput, string[]>>;
          formError?: string;
      };

export async function signIn(input: LoginInput): Promise<LoginResult> {
    const parsedInput = LoginSchema.safeParse(input);

    if (!parsedInput.success) {
        return getTreeifiedError(parsedInput);
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
