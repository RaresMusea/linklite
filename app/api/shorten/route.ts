import { NextRequest, NextResponse } from 'next/server';
import { generateSlug } from '@/lib/utils';
import { z } from 'zod';
import { LinkCreationSchema } from '@/validation/LinkCreationSchema';
import { CreatedLink } from '@/dal/links/links.types';
import { createLink } from '@/dal/links/links.repo';

export async function POST(request: NextRequest): Promise<NextResponse> {
    const json: unknown = await request.json().catch(() => null);
    const parsed = LinkCreationSchema.safeParse(json);

    if (!parsed.success) {
        const tree = z.treeifyError(parsed.error);
        return NextResponse.json({ error: 'Validation error', details: tree }, { status: 400 });
    }

    const { url } = parsed.data;

    // TODO - check for auth users
    const ownerId = null;

    let slug = '';
    let created: CreatedLink | null = null;
    let attempts = 0;

    while (!created && attempts < 5) {
        slug = generateSlug();
        attempts++;

        try {
            created = await createLink({ ownerId, slug, targetUrl: url });
        } catch (error) {
            console.error(error);

            // @ts-expect-error Fixed later
            if (error.code === 'P2002') {
                created = null;
            } else {
                console.error(error);
                return NextResponse.json(
                    { error: 'An internal error occurred while attempting to shorten the provided URL' },
                    { status: 500 }
                );
            }
        }
    }

    if (!created) {
        return NextResponse.json({ error: 'Could not generate a unique slug. Please try again.' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    return NextResponse.json(
        {
            success: true,
            data: {
                created,
                shortUrl: `${baseUrl}/${created.slug}`,
            },
        },
        { status: 201 }
    );
}
