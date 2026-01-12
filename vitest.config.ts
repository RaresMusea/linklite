import { defineConfig, defineProject } from 'vitest/config';
import path from 'node:path';
import dotenv from 'dotenv';

const root = path.resolve(__dirname);

dotenv.config({ path: '.env.test' });

const alias = [
    { find: /^@\//, replacement: `${root}/` },
];

export default defineConfig({
    root,
    test: {
        globals: true,
        projects: [
            defineProject({
                root,
                resolve: { alias },
                test: {
                    name: 'unit',
                    environment: 'node',
                    include: ['tests/unit/**/*.test.ts'],
                },
            }),
            defineProject({
                root,
                resolve: { alias },
                test: {
                    name: 'integration',
                    environment: 'node',
                    include: ['tests/integration/**/*.test.ts'],
                },
            }),
            defineProject({
                root,
                resolve: { alias },
                test: {
                    name: 'ui',
                    environment: 'jsdom',
                    setupFiles: ['./tests/setup.ts'],
                    include: ['tests/ui/**/*.ui.test.{ts,tsx}'],
                },
            }),
        ],
    },
});
