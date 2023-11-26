import { Client, InteractionReplyOptions } from 'discord.js';
import { PollService } from '../services/poll-service';

export type ValidatePollInProgressOutput = ValidatePollInProgressOutputTrue | ValidatePollInProgressOutputFalse;
export type ValidatePollInProgressOutputTrue = { inProgress: true; reply: InteractionReplyOptions };
export type ValidatePollInProgressOutputFalse = { inProgress: false };

export class ScheduleService {
    constructor(private readonly pollService: PollService, private readonly discordClient: Client) {}

    public async validatePollInProgress(guildConnectionId): Promise<ValidatePollInProgressOutput> {
        const [inProgressPoll] = await this.pollService.getInProgressPoll(guildConnectionId);

        if (inProgressPoll) {
            return {
                inProgress: true,
                reply: {
                    content: `Scheduling is already in progress here: ${inProgressPoll.messageUrl}. Cancel it if you want to create a new one`,
                    ephemeral: true,
                },
            };
        }

        return { inProgress: false };
    }

    public async;
}
