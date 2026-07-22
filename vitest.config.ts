import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/**/__test?(s)__/**/*.test.{ts,js}'],
        environment: 'node',
        globals: true,
        setupFiles: ['./vitest.setup.ts'],
        pool: 'forks',
        // These are integration tests sharing one Postgres instance, so test
        // files must not run in parallel. In Vitest 4 this is fileParallelism;
        // the older poolOptions.forks.singleFork is silently ignored.
        fileParallelism: false,
    },
});
