import prisma from '../../primsaClient';
import { GuildConnectionService } from '../guild-connection.service';

describe('GuildConnectionService', () => {
    const guildConnectionService = new GuildConnectionService();

    beforeEach(async () => {
        await prisma.guildConnection.deleteMany();
    });

    describe('createGuildConnection', () => {
        it('creates a guild connection successfully', async () => {
            await guildConnectionService.createGuildConnection({
                connectionUserId: 'user123',
                guildId: 'guild123',
                username: 'testUser',
            });

            expect(await prisma.guildConnection.findFirstOrThrow()).toStrictEqual({
                id: expect.any(Number),
                guildId: 'guild123',
                connectionUserId: 'user123',
                username: 'testUser',
                email: '',
            });
        });
    });

    describe('getByGuildId', () => {
        it('fetches a guild connection by guildId successfully', async () => {
            await guildConnectionService.createGuildConnection({
                connectionUserId: 'user:1',
                guildId: 'guild:1',
                username: 'testUser',
            });

            await guildConnectionService.createGuildConnection({
                connectionUserId: 'user:1',
                guildId: 'guild:2',
                username: 'testUser',
            });

            const guildConnection = await guildConnectionService.getByGuildId('guild:1');

            expect(guildConnection).toStrictEqual({
                id: expect.any(Number),
                connectionUserId: 'user:1',
            });
        });
    });
});
