import { Collection } from 'discord.js';
import { ScheduleResponse } from './types';
import { logContext, makeLogger } from '../util/logger';

type Scheduling = { messageId: string; messageUrl: string; responses: Map<string, ScheduleResponse> };

const log = makeLogger(module);

export class PartyScheduler {
    private readonly inProcessScheduling = new Collection<string, Scheduling>();

    public hasEveryoneResponded(guildId: string, guildMemberCount: number): boolean {
        // TODO - this should be role based?
        const scheduling = this.getInProgressSchedule(guildId);
        const numberOfResponses = scheduling.responses.size;
        return guildMemberCount - 1 <= numberOfResponses; // Ignore bot
    }

    public isExistScheduleInProgress(guildId: string): boolean {
        return this.inProcessScheduling.has(guildId);
    }

    public getInProgressSchedule(guildId: string): Scheduling | null {
        return this.inProcessScheduling.get(guildId);
    }

    public cancelSchedule(guildId: string): void {
        this.inProcessScheduling.delete(guildId);
    }

    public closeSchedule(guildId: string): Map<string, ScheduleResponse> {
        const responses = this.inProcessScheduling.get(guildId).responses;
        this.inProcessScheduling.delete(guildId);
        return responses;
    }

    public addSchedulingMessage(guildId: string, messageId: string, messageUrl: string): void {
        const ctx = logContext(`${PartyScheduler.name}.${this.addSchedulingMessage.name}`, { guildId, messageId }, log);

        if (this.isExistScheduleInProgress(guildId)) {
            log.error(`${ctx} A scheduling is already in progress`);
            throw new Error('A scheduling is already in progress');
        }

        this.inProcessScheduling.set(guildId, {
            messageId,
            messageUrl,
            responses: new Map(),
        });
    }

    public addResponse(guildId: string, scheduleResponse: ScheduleResponse) {
        const ctx = logContext(`${PartyScheduler.name}.${this.addResponse.name}`, { guildId }, log);
        const scheduling = this.getInProgressSchedule(guildId);

        if (!scheduling) {
            log.error(`${ctx} Cannot add response as no scheduling is in progress`);
            throw new Error('Cannot add response as no scheduling is in progress');
        }

        scheduling.responses.set(scheduleResponse.userId, scheduleResponse);
    }
}
