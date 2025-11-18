import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config } from './config';

const adapter = new PrismaPg(config.dbUrl, {});

const prisma = new PrismaClient({
    log: ['warn', 'error'],
    adapter,
});

export default prisma;
