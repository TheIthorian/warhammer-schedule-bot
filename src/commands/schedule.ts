import {
    ActionRowBuilder,
    CacheType,
    ChatInputCommandInteraction,
    ComponentType,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from 'discord.js';
import { Command } from './types';
import { getInteractionLogDetails } from './interaction-info';
import { logContext, makeLogger } from '../util/logger';

const log = makeLogger(module);

const TIME_TO_REACT_MINUTES = 60;
const DAYS_OF_THE_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export class ScheduleCommand implements Command {
    public readonly data: SlashCommandBuilder;

    constructor() {
        this.data = new SlashCommandBuilder()
            .setName('schedule')
            .setDescription('Asks the group to schedule the next session');
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
        logContext(`${ScheduleCommand.name}.${this.execute.name}`, getInteractionLogDetails(interaction), log);

        const select = new StringSelectMenuBuilder()
            .setCustomId('starter')
            .setPlaceholder('Make a selection!')
            .setMinValues(0)
            .setMaxValues(7)
            .addOptions(DAYS_OF_THE_WEEK.map(day => new StringSelectMenuOptionBuilder().setLabel(day).setValue(day)));

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

        const response = await interaction.reply({
            content: 'Select the days that you are available next week:',
            components: [row],
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: TIME_TO_REACT_MINUTES * 60 * 1_000,
        });

        collector.on('collect', async collectionResponse => {
            await collectionResponse.reply(
                `${collectionResponse.user} has selected ${collectionResponse.values.join(', ')}!`
            );
        });
    }
}
