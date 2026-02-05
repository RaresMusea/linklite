import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http, { IncomingMessage, ServerResponse } from 'http';
import { probeRedirect } from '@/lib/redirect_safety/redirect_probe';

function createTestServer() {
    return http.createServer((req: IncomingMessage, res: ServerResponse) => {
        if (!req.url) {
            res.statusCode = 400;
            res.end();
            return;
        }

        if (req.url === '/redirect') {
            res.statusCode = 302;
            res.setHeader('Location', '/next');
            res.end();
            return;
        }

        if (req.url === '/redirect-no-location') {
            res.statusCode = 302;
            res.end();
            return;
        }

        res.statusCode = 200;
        res.end();
    });
}

describe('Probe redirect - Integration', () => {
    let server: http.Server;
    let baseUrl: string;

    beforeAll(async () => {
        server = createTestServer();
        await new Promise<void>((resolve) => {
            server.listen(0, () => resolve());
        });
        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        baseUrl = `http://127.0.0.1:${port}`;
    });

    afterAll(async () => {
        await new Promise<void>((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        });
    });

    it('Should return redirect details for 3xx responses with location', async () => {
        const result = await probeRedirect(`${baseUrl}/redirect`);

        expect(result).toEqual({
            kind: 'redirect',
            statusCode: 302,
            targetUrl: `${baseUrl}/next`,
            targetHost: '127.0.0.1',
        });
    });

    it('Should return no-redirect for non-3xx responses', async () => {
        const result = await probeRedirect(`${baseUrl}/ok`);

        expect(result).toEqual({ kind: 'no-redirect' });
    });

    it('Should return no-redirect when location header is missing', async () => {
        const result = await probeRedirect(`${baseUrl}/redirect-no-location`);

        expect(result).toEqual({ kind: 'no-redirect' });
    });
});
