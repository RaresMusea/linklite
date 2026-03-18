import { z } from 'zod';

type FieldErrors<T extends Record<string, unknown>> = Partial<Record<Extract<keyof T, string>, string[]>>;

export function getTreeifiedError<T extends Record<string, unknown>>(parsedInput: z.ZodSafeParseError<T>) {
    const tree = z.treeifyError(parsedInput.error);

    return {
        success: false as const,
        fieldErrors: Object.fromEntries(
            Object.entries(tree.properties ?? {}).map(([key, value]) => [key, value?.errors ?? []])
        ) as FieldErrors<T>,
    };
}
