import { it, describe, expect } from 'vitest';
import { fetchWhoisTextViaCli } from '@/lib/whois/whois.endpoints';

const RUN = process.env.RUN_WHOIS_INTEGRATION === '1';

(RUN ? describe : describe.skip)('WHOIS integration', () => {
    it('fetchWhoisTextViaCli returns text for example.com', async () => {
        const res = await fetchWhoisTextViaCli('example.com');
        expect(res.ok).toBe(true);
        if (res.ok) {
            expect(res.text.length).toBeGreaterThan(200);
        }
    }, 20_000);
});

it('returns ok:false when whois binary is missing', async () => {
    const res = await fetchWhoisTextViaCli('example.com', '__missing_whois__');
    expect(res.ok).toBe(false);
});
