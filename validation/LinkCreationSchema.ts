import { z } from 'zod';

const httpUrl = z.url({
    protocol: /^https?$/,
    hostname: z.regexes.domain,
});

export const LinkCreationSchema = z
    .object({
        url: httpUrl.trim().min(1, 'URL is required'),
    })
    .strict();
