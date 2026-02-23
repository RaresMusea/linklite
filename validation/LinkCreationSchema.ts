import { z } from 'zod';

const RawUrlSchema = z.string().trim().min(1, 'URL is required').max(2048, 'URL too long');

export const LinkCreationSchema = z
    .object({
        url: RawUrlSchema.superRefine((value, ctx) => {
            let url: URL;

            try {
                url = new URL(value);
            } catch {
                ctx.addIssue({
                    code: 'custom',
                    message: 'Invalid URL format!',
                });
                return;
            }

            if (!['http:', 'https:'].includes(url.protocol)) {
                ctx.addIssue({
                    code: 'custom',
                    message: 'Only HTTP and HTTPS URLs are allowed',
                });
            }

            if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) {
                ctx.addIssue({
                    code: 'custom',
                    message: 'Localhost URLs are not allowed!',
                });
            }
        }),
    })
    .strict();
