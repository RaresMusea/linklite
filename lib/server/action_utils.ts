import { z } from 'zod';

import { getTreeifiedError } from '@/lib/zod/error_treeifier';

type FieldErrors<T extends Record<string, unknown>> = Partial<Record<Extract<keyof T, string>, string[]>>;

export type AuthActionResult<TFields extends Record<string, unknown>> =
    | {
          success: true;
          message: string;
      }
    | {
          success: false;
          fieldErrors?: FieldErrors<TFields>;
          formError?: string;
      };

export function validateAuthActionInput<T extends Record<string, unknown>>(
    schema: z.ZodType<T>,
    input: T
): { success: true; data: T } | ReturnType<typeof getTreeifiedError<T>> {
    const parsedInput = schema.safeParse(input);

    if (!parsedInput.success) {
        return getTreeifiedError(parsedInput);
    }

    return {
        success: true,
        data: parsedInput.data,
    };
}
