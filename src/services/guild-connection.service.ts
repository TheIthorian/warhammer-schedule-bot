import prisma from '../primsaClient';

type CreateGuildConnectionInput = { connectionUserId: string; guildId: string; username: string };

export class GuildConnectionService {
    public async createGuildConnection({ connectionUserId, guildId, username }: CreateGuildConnectionInput) {
        return await prisma.guildConnection.create({
            data: {
                guildId,
                connectionUserId,
                username,
                email: '',
            },
        });
    }

    public async getByGuildId(guildId: string) {
        return await prisma.guildConnection.findFirst({
            select: { id: true, connectionUserId: true },
            where: { guildId },
        });
    }
}

export const guildConnectionService = new GuildConnectionService();
