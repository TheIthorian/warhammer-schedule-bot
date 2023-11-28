import { PollService } from '../poll.service';
import prisma from '../../primsaClient';
import { makeGuild } from '../../util/test-utils/record-generator';
import { GuildConnection } from '@prisma/client';
import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';
import { setTimeout } from 'timers/promises';

describe('PartyScheduler', () => {
    let channelId: string, guildConnection: GuildConnection;
    const messageId = randomUUID();
    const messageUrl = faker.internet.url();
    const userId1 = randomUUID();
    const userId2 = randomUUID();

    const username1 = faker.internet.userName();
    const username2 = faker.internet.userName();

    const partyScheduler = new PollService();

    beforeAll(async () => {
        const guild = await makeGuild();
        channelId = guild.channelId;
        guildConnection = guild.guildConnection;
    });

    beforeEach(async () => {
        await prisma.poll.deleteMany();
    });

    afterAll(async () => {
        await prisma.guildConnection.deleteMany({ where: { id: guildConnection.id } });
    });

    async function createPoll(userId: string, status = 'inProgress') {
        return await prisma.poll.create({
            data: {
                guildConnectionId: guildConnection.id,
                userId,
                messageId,
                messageUrl,
                channelId,
                status,
            },
        });
    }

    type CreatePollAnswerInput = { pollId: number; userId: string; answers: string[]; username: string };
    async function createPollAnswer({ pollId, userId, answers, username }: CreatePollAnswerInput) {
        return await prisma.pollAnswer.create({
            data: {
                pollId,
                guildConnectionId: guildConnection.id,
                userId,
                username,
                answer: answers.join(','),
                answeredDate: new Date(),
            },
        });
    }

    describe('hasEveryoneResponded', () => {
        test('should return true when everyone has responded', async () => {
            const poll = await createPoll(userId1);
            await createPollAnswer({
                pollId: poll.id,
                userId: userId1,
                answers: ['Monday', 'Tuesday'],
                username: username1,
            });
            await createPollAnswer({ pollId: poll.id, userId: userId2, answers: ['Tuesday'], username: username2 });

            expect(await partyScheduler.hasEveryoneResponded(guildConnection.id, 3)).toBe(true);
        });

        test('should return false when not everyone has responded', async () => {
            const poll = await createPoll(userId1);
            await createPollAnswer({
                pollId: poll.id,
                userId: userId1,
                answers: ['Monday', 'Tuesday'],
                username: username1,
            });

            expect(await partyScheduler.hasEveryoneResponded(guildConnection.id, 3)).toBe(false);
        });
    });

    describe('isExistPollInProgress', () => {
        test('should return true if a poll is in progress', async () => {
            await createPoll(userId1);

            expect(await partyScheduler.isExistPollInProgress(guildConnection.id)).toBe(true);
        });

        test('should return false if only poll is closed', async () => {
            await createPoll(userId1, 'closed');

            expect(await partyScheduler.isExistPollInProgress(guildConnection.id)).toBe(false);
        });

        test('should return false if there are no polls', async () => {
            expect(await partyScheduler.isExistPollInProgress(guildConnection.id)).toBe(false);
        });
    });

    describe('getInProgressPoll', () => {
        test('should return in-progress poll details', async () => {
            const poll1 = await createPoll(userId1);
            await createPollAnswer({
                pollId: poll1.id,
                userId: userId1,
                answers: ['Monday', 'Tuesday'],
                username: username1,
            });
            await setTimeout(100); // Make ordering predictable
            await createPollAnswer({ pollId: poll1.id, userId: userId2, answers: ['Tuesday'], username: username2 });

            expect(await partyScheduler.getInProgressPoll(guildConnection.id)).toStrictEqual([
                {
                    pollId: poll1.id,
                    guildConnectionId: guildConnection.id,
                    status: 'inProgress',
                    messageId,
                    messageUrl,
                    channelId,
                    userId: userId1,
                    username: username1,
                    answer: 'Monday,Tuesday',
                },
                {
                    pollId: poll1.id,
                    guildConnectionId: guildConnection.id,
                    status: 'inProgress',
                    messageId,
                    messageUrl,
                    channelId,
                    userId: userId2,
                    username: username2,
                    answer: 'Tuesday',
                },
            ]);
        });

        test('should return an empty array if no poll is in progress', async () => {
            expect(await partyScheduler.getInProgressPoll(guildConnection.id)).toStrictEqual([]);
        });
    });

    describe('cancelPoll', () => {
        test('should cancel the poll', async () => {
            const poll1 = await createPoll(userId1);
            await createPollAnswer({
                pollId: poll1.id,
                userId: userId1,
                answers: ['Monday', 'Tuesday'],
                username: username1,
            });
            await createPollAnswer({ pollId: poll1.id, userId: userId2, answers: ['Tuesday'], username: username2 });

            await partyScheduler.cancelPoll(guildConnection.id);

            expect(await prisma.poll.findFirst({ select: { status: true }, where: { id: poll1.id } })).toStrictEqual({
                status: 'cancelled',
            });
        });
    });

    describe('closePoll', () => {
        test('should close the poll and return responses', async () => {
            const poll1 = await createPoll(userId1);
            await createPollAnswer({
                pollId: poll1.id,
                userId: userId1,
                answers: ['Monday', 'Tuesday'],
                username: username1,
            });
            await createPollAnswer({ pollId: poll1.id, userId: userId2, answers: ['Tuesday'], username: username2 });

            const pollResults = await partyScheduler.closePoll(guildConnection.id);

            expect(pollResults.get(userId1)).toStrictEqual({ days: ['Monday', 'Tuesday'], userId: userId1 });
            expect(pollResults.get(userId2)).toStrictEqual({ days: ['Tuesday'], userId: userId2 });
        });
    });

    describe('createPoll', () => {
        test('should create a new poll', async () => {
            await partyScheduler.createPoll({
                messageId,
                messageUrl,
                channelId,
                userId: userId1,
                guildConnectionId: guildConnection.id,
            });

            expect(await prisma.poll.findFirst()).toStrictEqual({
                id: expect.any(Number),
                guildConnectionId: guildConnection.id,
                userId: userId1,
                messageId,
                messageUrl,
                channelId,
                status: 'inProgress',
            });
        });

        test('should throw an error if a poll is already in progress', async () => {
            await partyScheduler.createPoll({
                messageId,
                messageUrl,
                channelId,
                userId: userId1,
                guildConnectionId: guildConnection.id,
            });

            expect(() =>
                partyScheduler.createPoll({
                    messageId,
                    messageUrl,
                    channelId,
                    userId: userId1,
                    guildConnectionId: guildConnection.id,
                })
            ).rejects.toThrow('A poll is already in progress');
        });
    });

    describe('addPollAnswer', () => {
        test('should add a poll answer', async () => {
            const poll = await createPoll(userId1);

            await partyScheduler.addPollAnswer(guildConnection.id, {
                userId: userId1,
                days: ['Friday', 'Monday'],
                username: username1,
            });

            expect(await prisma.pollAnswer.findFirst()).toStrictEqual({
                pollId: poll.id,
                guildConnectionId: guildConnection.id,
                userId: userId1,
                username: username1,
                answer: 'Friday,Monday',
                answeredDate: expect.any(Date),
            });
        });

        test('should throw an error if no poll is in progress', async () => {
            expect(async () => {
                await partyScheduler.addPollAnswer(guildConnection.id, {
                    userId: userId1,
                    days: ['Friday', 'Monday'],
                    username: username1,
                });
            }).rejects.toThrow('Cannot add response as no poll is in progress');
        });
    });
});
