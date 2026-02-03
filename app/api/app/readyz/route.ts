import { NextResponse } from 'next/server';
import { checkReady } from '@/dal/migrations/migrations.service';
import { ReadinessError } from '@/lib/errors/ReadinessError';
import { MigrationDetails } from '@/dal/migrations/migrations.types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export type AppReadinessResponse =
    | {
          ok: true;
          migrationDetails: MigrationDetails | null;
      }
    | {
          ok: false;
          reason: 'db' | 'migrations';
      };

export async function GET() {
    try {
        const result: AppReadinessResponse = await checkReady();

        return NextResponse.json(result, {
            status: 200,
            headers: { 'cache-control': 'no-store, max-age=0' },
        });
    } catch (err) {
        if (err instanceof ReadinessError) {
            return NextResponse.json(
                { ok: false, reason: err.reason },
                {
                    status: err.status,
                    headers: { 'cache-control': 'no-store, max-age=0' },
                }
            );
        }

        return NextResponse.json(
            { ok: false, reason: 'db' },
            {
                status: 503,
                headers: { 'cache-control': 'no-store, max-age=0' },
            }
        );
    }
}
