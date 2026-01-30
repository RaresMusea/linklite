import { defineConfig } from 'vitest/config';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const root = path.resolve(__dirname);

export default defineConfig({
    root,
    resolve: {
        alias: [{ find: /^@\//, replacement: `${root}/` }],
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/unit/**/*.test.ts'],

        reporters: ['default', 'junit'],
        outputFile: {
            junit: 'reports/unit/junit.xml',
        },

        coverage: {
            provider: 'v8',
            reportsDirectory: 'coverage/unit',
            reporter: ['text', 'html', 'lcov', 'json-summary'],
        },
    },
});
