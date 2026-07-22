import { ReminderService } from '../services/reminder.service';
import { UserTimezoneService } from '../services/user-timezone.service';
import { CacheType, ChatInputCommandInteraction, SharedSlashCommand, SlashCommandBuilder, time } from 'discord.js';
import { Command } from './types';
import { getInteractionLogDetails } from '../util/interaction-info';
import { logContext, makeLogger } from '../util/logger';

const log = makeLogger(module);

export class BookCommand implements Command {
    public readonly data: SharedSlashCommand;

    constructor(
        private readonly reminderService: ReminderService,
        private readonly userTimezoneService: UserTimezoneService,
    ) {
        this.data = new SlashCommandBuilder()
            .setName('book')
            .setDescription('Book the next session')
            .addStringOption((option) =>
                option.setName('date').setDescription('Date of the session to book').setRequired(true),
            );
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>, guildConnectionId: number): Promise<void> {
        const ctx = logContext(`${BookCommand.name}.${this.execute.name}`, getInteractionLogDetails(interaction), log);

        const inputDateString = interaction.options.getString('date');

        if (inputDateString === null) {
            log.error(`${ctx} required 'date' option was missing from the interaction`);
            await interaction.reply({ content: 'Please provide a date.', ephemeral: true });
            return;
        }

        const timezone = await this.userTimezoneService.getTimezone(interaction.user.id);

        if (timezone === null) {
            log.info(`${ctx} user has no timezone set`);
            await interaction.reply({
                content:
                    "I don't know your timezone yet, so I can't tell what time you mean. " +
                    'Set it with `/timezone` (e.g. `/timezone Europe/London`) and then book again.',
                ephemeral: true,
            });
            return;
        }

        const response = this.reminderService.getDateAndResponseFromCommandInput(inputDateString, timezone);

        if (response.isSuccess === false) {
            log.info({ inputDateString }, `${ctx} error parsing date`);
            await interaction.reply({ content: response.responseContent, ephemeral: true });
            return;
        }

        await interaction.reply({
            content: `${interaction.user} has booked the next session for ${time(response.inputDate)}`,
            ephemeral: false,
        });

        const { channelId } = interaction;
        await this.reminderService.addReminder({ date: response.inputDate, guildConnectionId, channelId, timezone });
    }
}
