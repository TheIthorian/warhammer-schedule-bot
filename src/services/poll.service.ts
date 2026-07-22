import { ScheduleResponse, ScheduleResponseWithUsername } from '../scheduling/types';
import { logContext, makeLogger } from '../util/logger';
import prisma from '../primsaClient';
import { DayOfTheWeek } from '../constants';
import { Poll } from '@prisma/client';

const log = makeLogger(module);

type PollDetails = {
    pollId: number;
    guildConnectionId: number;
    status: string;
    messageId: string;
    messageUrl: string;
    channelId: string;
    userId?: string;
    username?: string;
    answer?: string;
};

type CreatePollInput = {
    guildConnectionId: number;
    messageId: string;
    messageUrl: string;
    channelId: string;
    userId: string;
};

export class PollService {
    public async hasEveryoneResponded(guildConnectionId: number, guildMemberCount: number): Promise<boolean> {
        // TODO - this should be role based?
        const pollDetails = await this.getInProgressPoll(guildConnectionId);
        const numberOfResponses = pollDetails.length;
        return guildMemberCount - 1 <= numberOfResponses; // Ignore bot
    }

    public async isExistPollInProgress(guildConnectionId: number): Promise<boolean> {
        const result = await prisma.poll.findFirst({
            select: { id: true },
            where: { guildConnectionId, status: 'inProgress' },
            orderBy: { id: 'desc' },
        });

        return !!result;
    }

    public async getInProgressPoll(guildConnectionId: number): Promise<PollDetails[]> {
        const polls = await prisma.poll.findMany({
            where: { guildConnectionId, status: 'inProgress' },
            include: { PollAnswers: { orderBy: { answeredDate: 'asc' } } },
            orderBy: { id: 'asc' },
        });

        // Flattened to one row per answer to preserve the shape callers were written against.
        // A poll with no answers still yields a single row (the previous LEFT JOIN behaviour).
        return polls.flatMap((poll) => {
            const pollFields = {
                pollId: poll.id,
                guildConnectionId: poll.guildConnectionId,
                status: poll.status,
                messageId: poll.messageId,
                messageUrl: poll.messageUrl,
                channelId: poll.channelId,
            };

            if (!poll.PollAnswers.length) {
                return [pollFields];
            }

            return poll.PollAnswers.map((pollAnswer) => ({
                ...pollFields,
                userId: pollAnswer.userId,
                username: pollAnswer.username ?? undefined,
                answer: pollAnswer.answer,
            }));
        });
    }

    public async cancelPoll(guildConnectionId: number): Promise<void> {
        await prisma.poll.updateMany({
            data: { status: 'cancelled' },
            where: { guildConnectionId, status: 'inProgress' },
        });
    }

    public async closePoll(guildConnectionId: number): Promise<Map<string, ScheduleResponse>> {
        const ctx = logContext(`${PollService.name}.${this.closePoll.name}`, { guildConnectionId }, log);

        const poll = await prisma.poll.findFirst({
            where: { guildConnectionId, status: 'inProgress' },
            include: { PollAnswers: { orderBy: { answeredDate: 'asc' } } },
            orderBy: { id: 'asc' },
        });

        const responsesByUser = new Map<string, ScheduleResponse>();

        if (!poll) {
            log.warn(`${ctx} No poll is in progress - nothing to close`);
            return responsesByUser;
        }

        await prisma.poll.update({ data: { status: 'closed' }, where: { id: poll.id } });

        for (const { userId, answer } of poll.PollAnswers) {
            responsesByUser.set(userId, { days: answer.split(',') as DayOfTheWeek[], userId });
        }

        return responsesByUser;
    }

    public async createPoll({
        messageId,
        messageUrl,
        channelId,
        userId,
        guildConnectionId,
    }: CreatePollInput): Promise<Poll> {
        const ctx = logContext(
            `${PollService.name}.${this.createPoll.name}`,
            { guildConnectionId, messageId, userId, channelId },
            log,
        );

        if (await this.isExistPollInProgress(guildConnectionId)) {
            log.error(`${ctx} A poll is already in progress`);
            throw new Error('A poll is already in progress');
        }

        return await prisma.poll.create({
            data: {
                userId,
                guildConnectionId,
                messageId,
                messageUrl,
                channelId,
                status: 'inProgress',
            },
        });
    }

    public async addPollAnswer(
        guildConnectionId: number,
        scheduleResponse: ScheduleResponseWithUsername,
    ): Promise<void> {
        const ctx = logContext(`${PollService.name}.${this.addPollAnswer.name}`, { guildConnectionId }, log);
        const poll = await this.getInProgressPoll(guildConnectionId);

        if (!poll.length) {
            log.error(`${ctx} Cannot add response as no poll is in progress`);
            throw new Error('Cannot add response as no poll is in progress');
        }

        const existingPoll = poll[0];

        const answer = scheduleResponse.days.join(',');

        await prisma.pollAnswer.upsert({
            create: {
                pollId: existingPoll.pollId,
                guildConnectionId,
                username: scheduleResponse.username,
                userId: scheduleResponse.userId,
                answer,
                answeredDate: new Date(),
            },
            update: { answer, answeredDate: new Date() },
            where: { pollId_userId: { pollId: existingPoll.pollId, userId: scheduleResponse.userId } },
        });
    }
}

export const pollService = new PollService();
