import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
    try {
        return NextResponse.json(
            {
                ok: true,
                service: `linklite-${process.env.APP_ENV ?? ''}`,
                env: process.env.APP_ENV ?? 'unknown',
                version: process.env.APP_VERSION ?? 'unknown',
                commit: process.env.APP_COMMIT ?? 'unknown',
                uptime: process.uptime(),
                nodeVersion: process.version,
                time: new Date().toISOString(),
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('[HEALTH_CHECK_ERROR]', error);

        return NextResponse.json(
            {
                ok: false,
                error: 'Internal server error',
                time: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}
