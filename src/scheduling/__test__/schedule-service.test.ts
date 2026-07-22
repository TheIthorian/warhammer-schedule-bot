import { pollService } from '../../services/poll.service';
import { ScheduleService } from '../schedule-service';
import { guildConnectionService } from '../../services/guild-connection.service';
import { faker } from '@faker-js/faker';
import { vi } from 'vitest';
import { Channel, Client, Message } from 'discord.js';
import prisma from '../../primsaClient';

const mockDiscordClient = { channels: { cache: new Map<string, Channel>(), fetch: vi.fn() } };
const mockChannel = {
    messages: { cache: new Map<string, Message<boolean>>(), fetch: vi.fn() },
    isTextBased: vi.fn(),
};
const mockMessage = {
    edit: vi.fn(),
    startThread: vi.fn(),
    hasThread: false,
    thread: { send: vi.fn() },
};

describe('ScheduleService', () => {
    let guildConnection: Awaited<ReturnType<typeof guildConnectionService.createGuildConnection>>;

    const guildId = faker.string.numeric();
    const channelId = faker.string.numeric();
    const userId = faker.string.numeric();
    const connectionUserId = faker.string.numeric();
    const username = faker.internet.username();

    const scheduleService = new ScheduleService(pollService, mockDiscordClient as unknown as Client);

    beforeAll(async () => {
        guildConnection = await guildConnectionService.createGuildConnection({ connectionUserId, guildId, username });
    });

    beforeEach(async () => {
        await prisma.poll.deleteMany({ where: { guildConnectionId: guildConnection.id } });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('validatePollInProgress', () => {
        it('returns false when no poll is in progress', async () => {
            expect(await scheduleService.validatePollInProgress(guildConnection.id)).toStrictEqual({
                inProgress: false,
            });
        });

        it('returns true when a poll is in progress', async () => {
            const messageUrl = faker.internet.url();
            const messageId = faker.string.numeric();

            await pollService.createPoll({
                messageId,
                messageUrl,
                channelId,
                userId,
                guildConnectionId: guildConnection.id,
            });

            expect(await scheduleService.validatePollInProgress(guildConnection.id)).toStrictEqual({
                inProgress: true,
                reply: {
                    content: `Scheduling is already in progress here: ${messageUrl}. Cancel it if you want to create a new one`,
                    ephemeral: true,
                },
            });
        });
    });

    describe('getSchedulingMessageComponents', () => {
        it('should return the message components', () => {
            const message = scheduleService.getSchedulingMessageComponents();

            expect(message.content).toStrictEqual(
                'Hey everyone 👋 Please select the days that you are available next week',
            );

            expect(message.components[0].toJSON()).toMatchSnapshot();
            expect(message.components[1].toJSON()).toMatchSnapshot();
        });
    });

    describe('disablePoll', () => {
        const messageId = faker.string.numeric();

        beforeEach(() => {
            mockDiscordClient.channels.cache.set(channelId, mockChannel as unknown as Channel);
            mockChannel.messages.cache.set(messageId, mockMessage as unknown as Message);
            mockChannel.isTextBased.mockReturnValue(true);
        });

        it('replaces the message with disabled components when the message is cached', async () => {
            await scheduleService.disablePoll(channelId, messageId);

            expect(mockMessage.edit.mock.calls[0]).toMatchSnapshot();
            expect(mockChannel.messages.fetch).not.toHaveBeenCalled();
        });

        it('replaces the message with disabled components when the message is not cached', async () => {
            mockChannel.messages.cache.delete(messageId);
            mockChannel.messages.fetch.mockResolvedValueOnce(mockMessage);

            await scheduleService.disablePoll(channelId, messageId);

            expect(mockMessage.edit.mock.calls[0]).toMatchSnapshot();
            expect(mockChannel.messages.fetch).toHaveBeenCalledWith(messageId);
        });

        it('replaces the message with disabled components when the channel is not cached', async () => {
            mockDiscordClient.channels.cache.delete(channelId);
            mockDiscordClient.channels.fetch.mockResolvedValueOnce(mockChannel);

            await scheduleService.disablePoll(channelId, messageId);

            expect(mockMessage.edit.mock.calls[0]).toMatchSnapshot();
            expect(mockDiscordClient.channels.fetch).toHaveBeenCalledWith(channelId);
        });

        it('does not replace the message when the channel is not text based', async () => {
            mockChannel.isTextBased.mockReturnValue(false);

            await scheduleService.disablePoll(channelId, messageId);

            expect(mockMessage.edit).not.toHaveBeenCalled();
            expect(mockChannel.messages.fetch).not.toHaveBeenCalled();
        });
    });

    describe('addPollResponse', () => {
        const messageId = faker.string.numeric();
        const messageUrl = faker.internet.url();
        let pollId: number;

        beforeEach(async () => {
            mockDiscordClient.channels.cache.set(channelId, mockChannel as unknown as Channel);
            mockChannel.messages.cache.set(messageId, mockMessage as unknown as Message);
            mockChannel.isTextBased.mockReturnValue(true);

            ({ id: pollId } = await pollService.createPoll({
                messageId,
                messageUrl,
                channelId,
                userId,
                guildConnectionId: guildConnection.id,
            }));
        });

        afterEach(async () => {
            await prisma.poll.deleteMany({ where: { guildConnectionId: guildConnection.id } });
        });

        it('does not send a thread message when the channel is not text based', async () => {
            mockChannel.isTextBased.mockReturnValue(false);

            await scheduleService.addPollResponse({
                userId,
                username,
                answer: ['Monday', 'Tuesday'],
                channelId,
                guildConnectionId: guildConnection.id,
            });

            expect(mockMessage.thread.send).not.toHaveBeenCalled();
            expect(mockMessage.startThread).not.toHaveBeenCalled();
        });

        it('creates a thread if one does not exist', async () => {
            mockMessage.hasThread = false;
            mockMessage.startThread.mockResolvedValue(mockMessage.thread);

            await scheduleService.addPollResponse({
                userId,
                username,
                answer: ['Monday', 'Tuesday'],
                channelId,
                guildConnectionId: guildConnection.id,
            });

            expect(mockMessage.startThread).toHaveBeenCalledWith({ name: 'Responders' });
            expect(mockMessage.thread.send).toHaveBeenCalledWith(`${username} selected Monday, Tuesday`);
        });

        it('does not create a thread if one exist', async () => {
            mockMessage.hasThread = true;
            await scheduleService.addPollResponse({
                userId,
                username,
                answer: ['Monday', 'Tuesday'],
                channelId,
                guildConnectionId: guildConnection.id,
            });

            expect(mockMessage.startThread).not.toHaveBeenCalled();
            expect(mockMessage.thread.send).toHaveBeenCalledWith(`${username} selected Monday, Tuesday`);
        });

        it('adds poll answers', async () => {
            mockMessage.hasThread = true;
            await scheduleService.addPollResponse({
                userId,
                username,
                answer: ['Monday', 'Tuesday'],
                channelId,
                guildConnectionId: guildConnection.id,
            });

            expect(
                await prisma.pollAnswer.findMany({ where: { guildConnectionId: guildConnection.id } }),
            ).toStrictEqual([
                {
                    answer: 'Monday,Tuesday',
                    answeredDate: expect.any(Date),
                    guildConnectionId: guildConnection.id,
                    userId,
                    username,
                    pollId,
                },
            ]);
        });
    });
});
