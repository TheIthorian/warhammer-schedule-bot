import { AnySelectMenuInteraction, CacheType, ButtonInteraction } from 'discord.js';
import { MessageComponentInteractionHandler } from './types';
import { logContext, makeLogger } from '../util/logger';
import { getInteractionLogDetails } from '../util/interaction-info';
import { PollService } from '../services/poll.service';
import { DayOfTheWeek } from '../constants';
import { ScheduleService } from '../scheduling/schedule-service';
import { PollResultsFormatter } from '../scheduling/types';

const log = makeLogger(module);

export class SelectOptionInteraction implements MessageComponentInteractionHandler {
    constructor(
        private readonly pollService: PollService,
        private readonly scheduleService: ScheduleService,
        private readonly pollResultsFormatter: PollResultsFormatter
    ) {}

    async execute(
        interaction: AnySelectMenuInteraction<CacheType> | ButtonInteraction<CacheType>,
        guildConnectionId: number
    ): Promise<void> {
        const ctx = logContext(
            `${SelectOptionInteraction.name}.${this.execute.name}`,
            { ...getInteractionLogDetails(interaction), messageId: interaction.message.id },
            log
        );

        if (!(await this.pollService.isExistPollInProgress(guildConnectionId))) {
            log.error(`${ctx} - no poll in progress. Skipping message interaction.`);
            return;
        }

        if (interaction.isAnySelectMenu()) {
            log.info(`${ctx} Handling menu select`); // TODO - this should also check the messageId matches the poll's messageId
            await this.handleChannelSelectMenu(interaction, guildConnectionId);
        } else if (interaction.isButton()) {
            log.info(`${ctx} Handling button click`);
            await this.handleButtonClick(interaction, guildConnectionId);
        } else {
            log.info(`${ctx} unhandled interaction ${interaction}`);
        }
    }

    private async handleChannelSelectMenu(
        interaction: AnySelectMenuInteraction<CacheType>,
        guildConnectionId: number
    ): Promise<void> {
        const ctx = logContext(
            `${SelectOptionInteraction.name}.${this.handleChannelSelectMenu.name}`,
            { ...getInteractionLogDetails(interaction), messageId: interaction.message.id },
            log
        );

        await this.pollService.addPollAnswer(guildConnectionId, {
            userId: interaction.user.id,
            days: interaction.values as DayOfTheWeek[],
            username: interaction.user.username,
        });

        await this.scheduleService.setResponders(interaction.channelId, guildConnectionId);

        log.info(`${ctx} poll answer added.`);
        interaction.reply({ content: `You have selected ${interaction.values.join(', ')}!`, ephemeral: true });

        if (await this.pollService.hasEveryoneResponded(guildConnectionId, interaction.guild.memberCount)) {
            log.info(`${ctx} everyone has responded.`);
            await interaction.followUp({ content: 'Everyone has replied! You may close the poll' });
        }
    }

    private async handleButtonClick(
        interaction: ButtonInteraction<CacheType>,
        guildConnectionId: number
    ): Promise<void> {
        const ctx = logContext(
            `${SelectOptionInteraction.name}.${this.handleButtonClick.name}`,
            { ...getInteractionLogDetails(interaction), messageId: interaction.message.id },
            log
        );

        await this.scheduleService.disablePoll(interaction.channelId, interaction.message.id);

        const wasCancelled = interaction.customId === 'cancel';
        if (wasCancelled) {
            log.info(`${ctx} collected response from ${interaction.user.id} to cancel poll`);
            await this.pollService.cancelPoll(guildConnectionId);
            await interaction.reply(`${interaction.user} has cancelled the poll`);
            return;
        }

        log.info(`${ctx} collected response from ${interaction.user.id} to close poll`);
        await interaction.reply(`${interaction.user} has closed the poll`);

        const results = await this.pollService.closePoll(guildConnectionId);
        const formattedResults = this.pollResultsFormatter.format(results);

        await interaction.followUp(`The poll was closed.\n${formattedResults}`);
    }
}
