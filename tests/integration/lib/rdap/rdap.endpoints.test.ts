import { describe, it, expect } from 'vitest';
import http from 'node:http';
import { fetchRdapJson } from '@/lib/rdap/rdap.endpoints';

function startServer(handler: http.RequestListener) {
    return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
        const server = http.createServer(handler);
        server.listen(0, () => {
            const addr = server.address();
            const port = typeof addr === 'object' && addr ? addr.port : 0;
            resolve({
                url: `http://127.0.0.1:${port}`,
                close: () => new Promise<void>((r) => server.close(() => r())),
            });
        });
    });
}

describe('fetchRdapJson (integration tests)', () => {
    it('returns ok=true and parses json', async () => {
        const srv = await startServer((_req, res) => {
            res.writeHead(200, { 'content-type': 'application/rdap+json' });
            res.end(JSON.stringify({ events: [{ eventAction: 'registration', eventDate: '2020-01-01T00:00:00Z' }] }));
        });

        const result = await fetchRdapJson(`${srv.url}/rdap`);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.json).toBeTypeOf('object');

        await srv.close();
    });

    it('times out', async () => {
        const srv = await startServer(async (_req, res) => {
            // never respond
            setTimeout(() => {
                res.writeHead(200, { 'content-type': 'application/rdap+json' });
                res.end(JSON.stringify({ ok: true }));
            }, 10_000);
        });

        const result = await fetchRdapJson(`${srv.url}/slow`, 50);
        expect(result.ok).toBe(false);
        expect(result.status).toBe(0);

        await srv.close();
    });

    it('handles non-2xx response type', async () => {
        const srv = await startServer((_req, res) => {
            res.writeHead(404, { 'content-type': 'application/rdap+json' });
            res.end(JSON.stringify({ errorCode: 404, title: 'Not Found' }));
        });

        const result = await fetchRdapJson(`${srv.url}/missing`);
        expect(result.ok).toBe(false);
        expect(result.status).toBe(404);

        await srv.close();
    });
});
