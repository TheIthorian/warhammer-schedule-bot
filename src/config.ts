import { assertResource } from './util';
import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV;

if (nodeEnv === 'test') {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

export const config = {
    applicationId: assertResource(process.env.APPLICATION_ID),
    publicKey: assertResource(process.env.PUBLIC_KEY),

    botToken: assertResource(process.env.BOT_TOKEN),

    clientId: assertResource(process.env.CLIENT_ID),
    clientSecret: assertResource(process.env.CLIENT_SECRET),

    permissionsInt: 377957255232,

    isLocal: nodeEnv === 'local',

    dbUrl: assertResource(process.env.DATABASE_URL),

    aiService: {
        url: process.env.AI_SERVICE_URL,
        apiKey: process.env.AI_SERVICE_API_KEY,
    },

    discord: {
        baseAuthUrl: 'https://discord.com/oauth2/authorize',
        tokenUrl: 'https://discord.com/api/oauth2/token',
        tokenRevokationUrl: 'https://discord.com/api/oauth2/token/revoke',
    },

    adminUsers: process.env.ADMIN_USERS?.split(',')?.map(id => id.trim()) ?? [],

    discordBotUserId: '', // Assigned at runtime
};
