import { config } from 'dotenv';

config({ path: '.env.test' });

if (!process.env['TEST_DATABASE_URL']) {
    throw new Error('TEST_DATABASE_URL is not set. Run `docker compose up -d db` and check .env.test');
}
