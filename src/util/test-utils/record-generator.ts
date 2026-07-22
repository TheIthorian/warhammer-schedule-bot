import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';
import { GuildConnection } from '@prisma/client';
import prisma from '../../primsaClient';

export async function makeGuild(): Promise<{ guildConnection: GuildConnection; channelId: string }> {
    const guildId = randomUUID();
    const channelId = randomUUID();
    const connectionUserId = randomUUID();

    const username = faker.internet.username();
    const email = faker.internet.email();

    const guildConnection = await prisma.guildConnection.create({
        data: { guildId, connectionUserId, username, email },
    });

    return { guildConnection, channelId };
}
