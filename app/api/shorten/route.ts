import { NextRequest, NextResponse } from 'next/server';
import { generateSlug } from '@/lib/utils';
import { z } from 'zod';
import { LinkCreationSchema } from '@/validation/LinkCreationSchema';
import { createLink } from '@/dal/links/links.repo';
import { getOrigin } from '@/lib/origin';
import { AppError } from '@/lib/errors/AppError';

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const json: unknown = await request.json().catch(() => null);
        const parsed = LinkCreationSchema.safeParse(json);

        if (!parsed.success) {
            const tree = z.treeifyError(parsed.error);
            return NextResponse.json(
                { success: false, error: 'Validation error', details: tree, code: 'VALIDATION_ERROR' },
                { status: 400 }
            );
        }

        const { url } = parsed.data;
        const ownerId = null;

        let created = null as Awaited<ReturnType<typeof createLink>> | null;

        for (let attempts = 0; !created && attempts < 5; attempts++) {
            const slug = generateSlug();

            try {
                created = await createLink({ ownerId, slug, targetUrl: url });
            } catch (err) {
                if (isPrismaUniqueError(err)) continue;
                throw err;
            }
        }

        if (!created) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Could not generate a unique slug. Please try again.',
                    code: 'SLUG_EXHAUSTED',
                },
                { status: 500 }
            );
        }

        const baseUrl = getOrigin(request) ?? 'http://localhost:3000';

        return NextResponse.json(
            {
                success: true,
                data: { created, shortUrl: `${baseUrl}/${created.slug}` },
            },
            { status: 201 }
        );
    } catch (err) {
        // log once (server-side)
        console.error(err);
        return toErrorResponse(err);
    }
}

function isPrismaUniqueError(e: unknown): e is { code: 'P2002' } {
    if (typeof e !== 'object' || e === null) return false;
    if (!('code' in e)) return false;

    const code = (e as Record<string, unknown>).code;
    return code === 'P2002';
}

export function toErrorResponse(err: unknown): NextResponse {
    if (err instanceof AppError) {
        const message = err.expose ? err.message : 'An error occurred';
        return NextResponse.json({ success: false, error: message, code: err.code }, { status: err.status });
    }

    if (isPrismaUniqueError(err)) {
        return NextResponse.json(
            { success: false, error: 'Slug already exists', code: 'SLUG_CONFLICT' },
            { status: 409 }
        );
    }

    // Unknown -> 500 generic
    return NextResponse.json({ success: false, error: 'Internal server error', code: 'INTERNAL' }, { status: 500 });
}
