import { PartyScheduler } from './../scheduling/party-scheduler';
import {
    ActionRowBuilder,
    CacheType,
    ChatInputCommandInteraction,
    ComponentType,
    InteractionCollector,
    InteractionResponse,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    StringSelectMenuOptionBuilder,
} from 'discord.js';
import { Command } from './types';
import { getInteractionLogDetails } from '../util/interaction-info';
import { logContext, makeLogger } from '../util/logger';
import { ScheduleResponse } from '../scheduling/types';

const log = makeLogger(module);

const TIME_TO_REACT_MINUTES = 60;
const DAYS_OF_THE_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export class ScheduleCommand implements Command {
    public readonly data: SlashCommandBuilder;

    constructor(private readonly partyScheduler: PartyScheduler) {
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

        const guildId = interaction.guildId;

        // Already in progress
        if (this.partyScheduler.isExistScheduleInProgress(guildId)) {
            log.info(`${ctx} scheduling is already in progress`);
            return await this.sendScheduleInProgressMessage(interaction);
        }

        // Start scheduling
        const { collector, response } = await this.sendSchedulingMessage(interaction);
        const { id: messageId, url: messageUrl } = await response.fetch();

        this.partyScheduler.addSchedulingMessage(guildId, messageId, messageUrl);

        // Collect responses
        collector.on('collect', async collectionResponse => {
            log.info(`${ctx} collected response from ${collectionResponse.user.id} for message ${messageId}`);

            const userScheduleResponse: ScheduleResponse = {
                days: collectionResponse.values,
                userId: collectionResponse.user.id,
                responseTime: collectionResponse.createdTimestamp,
            };

            await collectionResponse.reply(
                `${userScheduleResponse.userId} has selected ${userScheduleResponse.days.join(', ')}!`
            );

            this.partyScheduler.addResponse(guildId, userScheduleResponse);

            if (this.partyScheduler.hasEveryoneResponded(guildId, interaction.guild.memberCount)) {
                log.info(`${ctx} scheduling is finished`);
                await interaction.followUp({
                    content: 'Everyone has replied!',
                });
            }
        });
    }

    private async sendScheduleInProgressMessage(interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
        const { messageUrl } = this.partyScheduler.getInProgressSchedule(interaction.guildId);
        await interaction.reply({
            content: `Scheduling is already in progress here: ${messageUrl}. Cancel it if you want to create a new one`,
            ephemeral: true,
        });
    }

    private async sendSchedulingMessage(interaction: ChatInputCommandInteraction<CacheType>): Promise<{
        collector: InteractionCollector<StringSelectMenuInteraction<CacheType>>;
        response: InteractionResponse<boolean>;
    }> {
        const select = new StringSelectMenuBuilder()
            .setCustomId('starter')
            .setPlaceholder('Make a selection!')
            .setMinValues(0)
            .setMaxValues(7)
            .addOptions(DAYS_OF_THE_WEEK.map(day => new StringSelectMenuOptionBuilder().setLabel(day).setValue(day)));

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

        const response = await interaction.reply({
            content: 'Hey everyone 👋 Please select the days that you are available next week',
            components: [row],
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: TIME_TO_REACT_MINUTES * 60 * 1_000,
        });

        return { collector, response };
    }
}
