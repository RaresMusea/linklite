import { defineConfig } from 'vitest/config';
import path from 'node:path';

const root = path.resolve(__dirname);

export default defineConfig({
    root,
    resolve: {
        alias: [{ find: /^@\//, replacement: `${root}/` }],
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['tests/setup.ts'],
        include: ['tests/ui/**/*.ui.test.{ts,tsx}'],
        reporters: ['default', 'junit'],
        outputFile: {
            junit: 'reports/ui/junit.xml',
        },

        coverage: {
            provider: 'v8',
            reportsDirectory: 'coverage/ui',
            reporter: ['text', 'html', 'lcov', 'json-summary'],
        },
    },
});
