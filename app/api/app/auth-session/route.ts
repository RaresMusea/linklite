import { auth } from '@/lib/auth/auth';

export async function GET(request: Request) {
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    return Response.json(session);
}
