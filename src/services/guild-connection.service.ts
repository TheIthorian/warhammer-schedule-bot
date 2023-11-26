import prisma from '../primsaClient';
import { logContext, makeLogger } from '../util/logger';

type CreateGuildConnectionInput = { connectionUserId: string; guildId: string; username: string };

const log = makeLogger(module);

export class GuildConnectionService {
    public async createGuildConnection({ connectionUserId, guildId, username }: CreateGuildConnectionInput) {
        logContext(this.createGuildConnection.name, { connectionUserId, guildId, username }, log);
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
        logContext(this.getByGuildId.name, { guildId }, log);
        return await prisma.guildConnection.findFirst({
            select: { id: true, connectionUserId: true },
            where: { guildId },
        });
    }
}

export const guildConnectionService = new GuildConnectionService();
