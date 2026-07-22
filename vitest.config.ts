import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/**/__test?(s)__/**/*.test.{ts,js}'],
        environment: 'node',
        globals: true,
        setupFiles: ['./vitest.setup.ts'],
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true,
            },
        },
    },
});
