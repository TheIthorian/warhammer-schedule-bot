import { assertResource } from './util';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
    applicationId: assertResource(process.env.APPLICATION_ID),
    publicKey: assertResource(process.env.PUBLIC_KEY),

    botToken: assertResource(process.env.BOT_TOKEN),

    clientId: assertResource(process.env.CLIENT_ID),
    clientSecret: assertResource(process.env.CLIENT_SECRET),

    permissionsInt: 377957255232,

    isLocal: process.env.NODE_ENV === 'local',
};
