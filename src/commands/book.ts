import { DateParser } from './../util/date-parser';
import { JobScheduler } from './../scheduling/job-scheduler';
import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, time } from 'discord.js';
import { Command } from './types';
import { getInteractionLogDetails } from '../util/interaction-info';
import { logContext, makeLogger } from '../util/logger';

const log = makeLogger(module);

export class BookCommand implements Command {
    public readonly data: SlashCommandBuilder;

    constructor(private readonly jobScheduler: JobScheduler, private readonly dateParser: DateParser) {
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
        const now = new Date();

        const inputDateString = interaction.options.getString('date');

        const inputDate = this.dateParser.parseNative(inputDateString);

        if (isNaN(inputDate.getTime())) {
            log.info(`${ctx} invalid date input: ${inputDateString}`);
            await interaction.reply({
                content: `${inputDateString} is not a valid date. Please use the format: DD/MM/YY HH:MM:SS`,
                ephemeral: true,
            });
            return;
        }

        if (inputDate.getTime() < now.getTime()) {
            log.info(`${ctx} date in the past ${inputDateString}. Currently ${now}`);
            await interaction.reply({
                content: `${inputDateString} is in the past. Please choose a date in the future, using the format: DD/MM/YY HH:MM:SS`,
                ephemeral: true,
            });
            return;
        }

        await interaction.reply({
            content: `${interaction.user} has booked the next session for ${time(inputDate)}`,
            ephemeral: false,
        });

        const dayReminder = new Date(inputDate);
        dayReminder.setHours(10, 0, 0, 0);

        const hourReminder = new Date(inputDate);
        hourReminder.setHours(inputDate.getHours() - 1);

        this.jobScheduler.scheduleJob(dayReminder, async ({ client }) => {
            const channel = client.channels.cache.get(interaction.channelId);
            if (channel.isTextBased()) {
                await channel.send(
                    `Hey @everyone 👋 don't forget we have our session today at ${time(inputDate, 't')}` // See formats https://old.discordjs.dev/#/docs/discord.js/14.14.0/typedef/TimestampStylesString
                );
            }
        });

        this.jobScheduler.scheduleJob(hourReminder, async ({ client }) => {
            const channel = client.channels.cache.get(interaction.channelId);
            if (channel.isTextBased()) {
                await channel.send(`Hey @everyone 👋 Today's session will be starting in ${time(inputDate, 'R')}`);
            }
        });
    }
}
