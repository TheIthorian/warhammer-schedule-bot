import { PollResultsFormatter } from './../scheduling/types';
import { PollService } from '../services/poll.service';
import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from './types';
import { getInteractionLogDetails } from '../util/interaction-info';
import { logContext, makeLogger } from '../util/logger';
import { GuildConnectionService } from '../services/guild-connection.service';
import { ScheduleService } from '../scheduling/schedule-service';

const log = makeLogger(module);

export class ScheduleCommand implements Command {
    public readonly data: SlashCommandBuilder;

    constructor(
        private readonly partyScheduler: PollService,
        private readonly guildConnectionService: GuildConnectionService,
        private readonly scheduleService: ScheduleService
    ) {
        this.data = new SlashCommandBuilder()
            .setName('schedule')
            .setDescription('Asks the group to schedule the next session');
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
        const ctx = logContext(
            `${ScheduleCommand.name}.${this.execute.name}`,
            getInteractionLogDetails(interaction),
            log
        );

        const { guildId, user, channelId } = interaction;
        const { id: guildConnectionId } = await this.guildConnectionService.getByGuildId(guildId);

        // Already in progress
        const validatePollInProgressResult = await this.scheduleService.validatePollInProgress(guildConnectionId);
        if (validatePollInProgressResult.inProgress === true) {
            log.info(`${ctx} scheduling is already in progress`);
            await interaction.reply(validatePollInProgressResult.reply);
            return;
        }

        // Start scheduling
        const schedulingMessageComponents = this.scheduleService.getSchedulingMessageComponents();
        const response = await interaction.reply(schedulingMessageComponents);

        const { id: messageId, url: messageUrl } = await response.fetch();
        await this.partyScheduler.createPoll({ messageId, channelId, userId: user.id, guildConnectionId, messageUrl });
    }
}
