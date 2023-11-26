import { ReminderService } from '../services/reminder.service';
import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, time } from 'discord.js';
import { Command } from './types';
import { getInteractionLogDetails } from '../util/interaction-info';
import { logContext, makeLogger } from '../util/logger';

const log = makeLogger(module);

export class BookCommand implements Command {
    public readonly data: SlashCommandBuilder;

    constructor(private readonly reminderService: ReminderService) {
        this.data = new SlashCommandBuilder()
            .setName('book')
            .setDescription('Book the next session')
            .addStringOption(option =>
                option.setName('date').setDescription('Date of the session to book').setRequired(true)
            )
            .setName('book'); // casts type back to slash command builder
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
        const ctx = logContext(`${BookCommand.name}.${this.execute.name}`, getInteractionLogDetails(interaction), log);

        const inputDateString = interaction.options.getString('date');
        const response = this.reminderService.getDateAndResponseFromCommandInput(inputDateString);

        if (response.isSuccess === false) {
            log.info(`${ctx} error parsing date`);
            await interaction.reply({ content: response.responseContent, ephemeral: true });
            return;
        }

        await interaction.reply({
            content: `${interaction.user} has booked the next session for ${time(response.inputDate)}`,
            ephemeral: false,
        });

        const { guildId, channelId } = interaction;
        await this.reminderService.addReminder({ date: response.inputDate, guildId, channelId });
    }
}
