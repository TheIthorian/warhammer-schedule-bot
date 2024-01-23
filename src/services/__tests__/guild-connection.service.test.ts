import prisma from '../../primsaClient';
import { GuildConnectionService } from '../guild-connection.service';

describe('GuildConnectionService', () => {
    const guildConnectionService = new GuildConnectionService();
    const guildConnectionIds: number[] = [];

    beforeEach(async () => {
        await prisma.guildConnection.deleteMany({ where: { id: { in: guildConnectionIds } } });
    });

    describe('createGuildConnection', () => {
        it('creates a guild connection successfully', async () => {
            const guildId = 'guild123';
            const gc = await guildConnectionService.createGuildConnection({
                connectionUserId: 'user123',
                guildId: guildId,
                username: 'testUser',
            });
            guildConnectionIds.push(gc.id);

            expect(await prisma.guildConnection.findUnique({ where: { guildId } })).toStrictEqual({
                id: expect.any(Number),
                guildId: guildId,
                connectionUserId: 'user123',
                username: 'testUser',
                email: '',
            });
        });
    });

    describe('getByGuildId', () => {
        it('fetches a guild connection by guildId successfully', async () => {
            const gc = await guildConnectionService.createGuildConnection({
                connectionUserId: 'user:1',
                guildId: 'guild:1',
                username: 'testUser',
            });
            guildConnectionIds.push(gc.id);

            const gc2 = await guildConnectionService.createGuildConnection({
                connectionUserId: 'user:1',
                guildId: 'guild:2',
                username: 'testUser',
            });
            guildConnectionIds.push(gc2.id);

            const guildConnection = await guildConnectionService.getByGuildId('guild:1');

            expect(guildConnection).toStrictEqual({
                id: expect.any(Number),
                connectionUserId: 'user:1',
            });
        });
    });
});
