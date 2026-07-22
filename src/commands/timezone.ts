import {
    AutocompleteInteraction,
    CacheType,
    ChatInputCommandInteraction,
    SharedSlashCommand,
    SlashCommandBuilder,
} from 'discord.js';
import { formatZoneLabel, searchTimezones } from '../util/timezone-search';
import { UserTimezoneService } from '../services/user-timezone.service';
import { Command } from './types';
import { getInteractionLogDetails } from '../util/interaction-info';
import { logContext, makeLogger } from '../util/logger';

const log = makeLogger(module);

export class TimezoneCommand implements Command {
    public readonly data: SharedSlashCommand;

    constructor(private readonly userTimezoneService: UserTimezoneService) {
        this.data = new SlashCommandBuilder()
            .setName('timezone')
            .setDescription('Set your timezone, so bookings are read in your local time')
            .addStringOption((option) =>
                option
                    .setName('timezone')
                    .setDescription('Start typing your city or region, e.g. London or New York')
                    .setRequired(true)
                    .setAutocomplete(true),
            );
    }

    async autocomplete(interaction: AutocompleteInteraction<CacheType>): Promise<void> {
        const query = interaction.options.getFocused();
        const suggestions = searchTimezones(query);

        await interaction.respond(suggestions.map((zone) => ({ name: formatZoneLabel(zone), value: zone })));
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
        const ctx = logContext(
            `${TimezoneCommand.name}.${this.execute.name}`,
            getInteractionLogDetails(interaction),
            log,
        );

        const timezone = interaction.options.getString('timezone');

        if (timezone === null) {
            log.error(`${ctx} required 'timezone' option was missing from the interaction`);
            await interaction.reply({ content: 'Please provide a timezone.', ephemeral: true });
            return;
        }

        const wasSet = await this.userTimezoneService.setTimezone(interaction.user.id, timezone);

        if (!wasSet) {
            await interaction.reply({
                content:
                    `\`${timezone}\` is not a timezone I recognise. Please use an IANA name such as ` +
                    '`Europe/London` or `America/New_York`. The full list is at ' +
                    '<https://en.wikipedia.org/wiki/List_of_tz_database_time_zones>.',
                ephemeral: true,
            });
            return;
        }

        await interaction.reply({ content: `Your timezone is now set to \`${timezone}\`.`, ephemeral: true });
    }
}
