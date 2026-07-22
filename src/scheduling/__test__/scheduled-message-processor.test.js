import { vi } from 'vitest';
import { ScheduledMessageProcessor } from '../scheduled-message-processor';
import prisma from '../../primsaClient';
import { makeGuild } from '../../util/test-utils/record-generator';

describe('ScheduledMessageProcessor', () => {
    let channelId, guildConnection, newMessageDetails;

    const earlier = new Date();
    earlier.setHours(earlier.getHours() - 1);
    const future = new Date(2099, 0, 1);

    const mockChannel = { isTextBased: vi.fn(), send: vi.fn() };
    const discordClientMock = { channels: { fetch: vi.fn() } };

    const scheduledMessageProcessor = new ScheduledMessageProcessor(discordClientMock);

    beforeAll(async () => {
        const guild = await makeGuild();
        channelId = guild.channelId;
        guildConnection = guild.guildConnection;
    });

    beforeEach(async () => {
        await prisma.scheduledMessage.deleteMany({ where: { guildConnectionId: guildConnection.id } });
        newMessageDetails = { guildConnectionId: guildConnection.id, scheduledDate: earlier, channelId };

        discordClientMock.channels.fetch.mockResolvedValue(mockChannel);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    afterAll(async () => {
        await prisma.guildConnection.deleteMany({ where: { id: guildConnection.id } });
    });

    describe('processMessages', () => {
        it('should send messages to the channel', async () => {
            const message1 = await createScheduledMessage(newMessageDetails);
            const message2 = await createScheduledMessage(newMessageDetails);

            mockChannel.isTextBased.mockReturnValue(true);

            // When
            await scheduledMessageProcessor.processMessages();

            // Then
            expect(discordClientMock.channels.fetch).toHaveBeenNthCalledWith(2, channelId);
            expect(mockChannel.send).toHaveBeenCalledWith(message1.messageContent);
            expect(mockChannel.send).toHaveBeenCalledWith(message2.messageContent);
        });

        it('should update the record status to "processed"', async () => {
            const message1 = await createScheduledMessage(newMessageDetails);
            const message2 = await createScheduledMessage(newMessageDetails);

            mockChannel.isTextBased.mockReturnValue(true);

            // When
            await scheduledMessageProcessor.processMessages();

            // Then
            await assertStatus([message1.id, message2.id], 'processed');
        });

        it('should not send message to the channel if the channel is not text based', async () => {
            const message1 = await createScheduledMessage(newMessageDetails);
            const message2 = await createScheduledMessage(newMessageDetails);

            mockChannel.isTextBased.mockReturnValue(false);

            // When
            await scheduledMessageProcessor.processMessages();

            // Then
            await assertStatus([message1.id, message2.id], 'processed');
            expect(mockChannel.send).not.toHaveBeenCalled();
        });

        it('should set the status to failed when the message failed to send', async () => {
            const message1 = await createScheduledMessage(newMessageDetails);
            const message2 = await createScheduledMessage(newMessageDetails);

            mockChannel.isTextBased.mockReturnValue(true);
            mockChannel.send.mockResolvedValueOnce(undefined).mockRejectedValue(new Error('unable to send message'));

            // When
            await scheduledMessageProcessor.processMessages();

            // Then
            expect(mockChannel.send).toHaveBeenCalledTimes(2);
            await assertStatus([message1.id], 'processed');
            await assertStatus([message2.id], 'retry', 1);

            await scheduledMessageProcessor.processMessages();
            await assertStatus([message2.id], 'retry', 2);
            expect(mockChannel.send).toHaveBeenCalledTimes(3);

            await scheduledMessageProcessor.processMessages();
            await assertStatus([message2.id], 'retry', 3);
            expect(mockChannel.send).toHaveBeenCalledTimes(4);

            await scheduledMessageProcessor.processMessages();
            await assertStatus([message2.id], 'failed', 3);
            expect(mockChannel.send).toHaveBeenCalledTimes(5);
        });

        it('should not process future messages', async () => {
            const message1 = await createScheduledMessage({ ...newMessageDetails, scheduledDate: future });

            mockChannel.isTextBased.mockReturnValue(true);

            // When
            await scheduledMessageProcessor.processMessages();

            // Then
            expect(mockChannel.send).not.toHaveBeenCalled();
            await assertStatus([message1.id], 'pending');
        });

        it('should not process already processed messages', async () => {
            const message1 = await createScheduledMessage({ ...newMessageDetails, status: 'processed' });

            mockChannel.isTextBased.mockReturnValue(true);

            // When
            await scheduledMessageProcessor.processMessages();

            // Then
            expect(mockChannel.send).not.toHaveBeenCalled();
            await assertStatus([message1.id], 'processed');
        });
    });

    async function createScheduledMessage({ guildConnectionId, channelId, scheduledDate = now, status = 'pending' }) {
        return prisma.scheduledMessage.create({
            data: {
                guildConnectionId,
                messageContent: 'message content',
                scheduledDate,
                channelId,
                status,
            },
        });
    }

    async function assertStatus(ids, status, retryCount = 0) {
        for (const id of ids) {
            const message = await prisma.scheduledMessage.findFirst({ where: { id } });
            expect(message.status).toBe(status);
            expect(message.retryCount).toBe(retryCount);
        }
    }
});
