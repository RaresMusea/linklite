import { describe, expect, it } from 'vitest';
import { getTestInstance } from 'better-auth/test';

describe('Better-Auth starter temporary e2e', () => {
    it('Runs sign up, sign in, and sign out flows', async () => {
        const { client } = await getTestInstance(
            {
                emailAndPassword: {
                    enabled: true,
                },
            },
            {
                disableTestUser: true,
            },
        );

        const email = `test+${Date.now()}@test.com`;
        const password = 'password123';

        const signUp = await client.signUp.email({
            email,
            password,
            name: 'Test User',
        });
        expect(signUp.error).toBeNull();

        const signOutAfterSignUp = await client.signOut();
        expect(signOutAfterSignUp.error).toBeNull();

        const signIn = await client.signIn.email({
            email,
            password,
        });
        expect(signIn.error).toBeNull();
        expect(signIn.data?.user.email).toBe(email);

        const signOut = await client.signOut();
        expect(signOut.error).toBeNull();
    });
});
