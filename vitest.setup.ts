import { config } from 'dotenv';

config({ path: '.env.test' });

if (!process.env['DATABASE_URL']) {
    throw new Error('DATABASE_URL is not set. Run `docker compose up -d db` and check .env.test');
}
