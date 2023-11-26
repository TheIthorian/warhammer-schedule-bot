import { ScheduleResponse } from './types';
import { logContext, makeLogger } from '../util/logger';
import prisma from '../primsaClient';
import { DayOfTheWeek } from '../constants';

const log = makeLogger(module);

type PollDetails = {
    pollId: number;
    guildConnectionId: number;
    status: string;
    messageId: string;
    messageUrl: string;
    channelId: string;
    userId?: string;
    answer?: string;
};

type CreatePollInput = {
    guildConnectionId: number;
    messageId: string;
    messageUrl: string;
    channelId: string;
    userId: string;
};

export class PartyScheduler {
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
        return await prisma.$queryRaw`SELECT P.id as pollId, 
            P.guildConnectionId, P.status, P.messageId, P.messageUrl, P.channelId,
            PA.userId, PA.answer
        FROM Poll P
        LEFT JOIN PollAnswer PA ON PA.pollId = P.id
        WHERE P.guildConnectionId = ${guildConnectionId}
        AND P.status = 'inProgress'
        ORDER BY P.id, PA.userId`;
    }

    public async cancelPoll(guildConnectionId: number): Promise<void> {
        await prisma.poll.updateMany({
            data: { status: 'cancelled' },
            where: { guildConnectionId },
        });
    }

    public async closePoll(guildConnectionId: number): Promise<Map<string, ScheduleResponse>> {
        type PollWithAnswers = { pollId: number; channelId: string; status: string; answer: string; userId: string };
        const pollWithAnswers = await prisma.$queryRaw<PollWithAnswers[]>`SELECT P.id as pollId, P.channelId, P.status, 
            PA.answer, PA.userId
        FROM Poll P
        JOIN PollAnswer PA ON PA.pollId = P.id
        WHERE P.guildConnectionId = ${guildConnectionId}
        AND P.status = 'inProgress'`;

        await prisma.$executeRaw`UPDATE Poll SET status = 'closed' WHERE id = ${pollWithAnswers[0].pollId}`;

        const responsesByUser = new Map<string, ScheduleResponse>();
        for (const { userId, answer } of pollWithAnswers) {
            responsesByUser.set(userId, { days: answer.split(',') as DayOfTheWeek[], userId: userId });
        }

        return responsesByUser;
    }

    public async createPoll({
        messageId,
        messageUrl,
        channelId,
        userId,
        guildConnectionId,
    }: CreatePollInput): Promise<void> {
        const ctx = logContext(
            `${PartyScheduler.name}.${this.createPoll.name}`,
            { guildConnectionId, messageId, userId, channelId },
            log
        );

        if (await this.isExistPollInProgress(guildConnectionId)) {
            log.error(`${ctx} A poll is already in progress`);
            throw new Error('A poll is already in progress');
        }

        await prisma.poll.create({
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

    public async addPollAnswer(guildConnectionId: number, scheduleResponse: ScheduleResponse): Promise<void> {
        const ctx = logContext(`${PartyScheduler.name}.${this.addPollAnswer.name}`, { guildConnectionId }, log);
        const poll = await this.getInProgressPoll(guildConnectionId);

        if (!poll) {
            log.error(`${ctx} Cannot add response as no poll is in progress`);
            throw new Error('Cannot add response as no poll is in progress');
        }

        const [{ pollId }] = await this.getInProgressPoll(guildConnectionId);

        const answer = scheduleResponse.days.join(',');

        await prisma.pollAnswer.upsert({
            create: {
                pollId,
                guildConnectionId,
                userId: scheduleResponse.userId,
                answer,
            },
            update: { answer },
            where: { pollId_userId: { pollId, userId: scheduleResponse.userId } },
        });
    }
}
