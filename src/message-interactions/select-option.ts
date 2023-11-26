import { AnySelectMenuInteraction, CacheType, ButtonInteraction } from 'discord.js';
import { MessageComponentInteractionHandler } from './types';
import { logContext, makeLogger } from '../util/logger';
import { getInteractionLogDetails } from '../util/interaction-info';
import { ScheduleService } from '../scheduling/schedule-service';
import { PollService } from '../services/poll-service';
import { GuildConnectionService } from '../services/guild-connection';
import { DayOfTheWeek } from '../constants';

const log = makeLogger(module);

export class SelectOptionInteraction implements MessageComponentInteractionHandler {
    constructor(
        private readonly pollService: PollService,
        private readonly guildConnectionService: GuildConnectionService
    ) {}

    async execute(interaction: AnySelectMenuInteraction<CacheType> | ButtonInteraction<CacheType>): Promise<void> {
        const ctx = logContext(
            `${SelectOptionInteraction.name}.${this.execute.name}`,
            { ...getInteractionLogDetails(interaction), messageId: interaction.message.id },
            log
        );

        const guildConnection = await this.guildConnectionService.getByGuildId(interaction.guildId);

        if (!(await this.pollService.isExistPollInProgress(guildConnection.id))) {
            log.error(`${ctx} - no poll in progress. Skipping message interaction.`);
            return;
        }

        if (interaction.isAnySelectMenu()) {
            log.info(`${ctx} Handling menu select`); // TODO - this should also check the messageId matches the poll's messageId
            await this.handleChannelSelectMenu(interaction, guildConnection.id);
        } else {
            log.info(`${ctx} unhandled interaction ${interaction.type}`);
        }

        return Promise.resolve();
    }

    private async handleChannelSelectMenu(interaction: AnySelectMenuInteraction<CacheType>, guildConnectionId: number) {
        const ctx = logContext(
            `${SelectOptionInteraction.name}.${this.handleChannelSelectMenu.name}`,
            { ...getInteractionLogDetails(interaction), messageId: interaction.message.id },
            log
        );

        await this.pollService.addPollAnswer(guildConnectionId, {
            userId: interaction.user.id,
            days: interaction.values as DayOfTheWeek[],
        });

        log.info(`${ctx} poll answer added.`);
        interaction.reply({ content: `You have selected ${interaction.values.join(', ')}!`, ephemeral: true });

        if (await this.pollService.hasEveryoneResponded(guildConnectionId, interaction.guild.memberCount)) {
            log.info(`${ctx} everyone has responded.`);
            await interaction.followUp({ content: 'Everyone has replied! You may close the poll' });
        }
    }
}
