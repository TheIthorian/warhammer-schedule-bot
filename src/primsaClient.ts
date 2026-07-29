import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { config } from './config';

const pool = new Pool({
    connectionString: config.dbUrl,
    query_timeout: 20_000,
    connectionTimeoutMillis: 20_000,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    log: ['warn', 'error'],
    adapter,
    transactionOptions: { timeout: 20_000, maxWait: 20_000 },
});

export default prisma;
