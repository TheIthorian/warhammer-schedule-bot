import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';
import prisma from '../../primsaClient';

export async function makeGuild() {
    const guildId = randomUUID();
    const channelId = randomUUID();
    const connectionUserId = randomUUID();

    const username = faker.internet.userName();
    const email = faker.internet.email();

    const guildConnection = await prisma.guildConnection.create({
        data: { guildId, connectionUserId, username, email },
    });

    return { guildConnection, channelId };
}
