import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Client,
    InteractionReplyOptions,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from 'discord.js';
import { PollService, pollService } from '../services/poll.service';
import { DAYS_OF_THE_WEEK } from '../constants';
import { client } from '../discord-client';

export type ValidatePollInProgressOutput = ValidatePollInProgressOutputTrue | ValidatePollInProgressOutputFalse;
export type ValidatePollInProgressOutputTrue = { inProgress: true; reply: InteractionReplyOptions };
export type ValidatePollInProgressOutputFalse = { inProgress: false };

const POLL_CREATION_TEXT = 'Hey @everyone 👋 Please select the days that you are available next week';

export class ScheduleService {
    constructor(private readonly pollService: PollService, private readonly discordClient: Client) {}

    public async validatePollInProgress(guildConnectionId: number): Promise<ValidatePollInProgressOutput> {
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

    public getSchedulingMessageComponents(): {
        content: string;
        components: (ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>)[];
    } {
        const row1 = daysOfTheWeekMenuRow();
        const row2 = pollControlButtonRow();

        return {
            content: POLL_CREATION_TEXT,
            components: [row1, row2],
        };
    }

    public async disablePoll(channelId: string, messageId: string): Promise<void> {
        const channel = this.discordClient.channels.cache.get(channelId);
        if (channel.isTextBased()) {
            const pollMessage = channel.messages.cache.get(messageId) || (await channel.messages.fetch(messageId));

            const disabledDaysOfTheWeekMenuRow = daysOfTheWeekMenuRow();
            disabledDaysOfTheWeekMenuRow.components.forEach(c => c.setDisabled(true));

            pollMessage.edit({
                components: [disabledDaysOfTheWeekMenuRow],
                content: `${POLL_CREATION_TEXT}\n(this poll has ended)`,
            });
        }
    }
}

function daysOfTheWeekMenuRow(): ActionRowBuilder<StringSelectMenuBuilder> {
    const select = new StringSelectMenuBuilder()
        .setCustomId('scheduler')
        .setPlaceholder('Make a selection!')
        .setMinValues(0)
        .setMaxValues(7)
        .addOptions(DAYS_OF_THE_WEEK.map(day => new StringSelectMenuOptionBuilder().setLabel(day).setValue(day)));
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    return row;
}

function pollControlButtonRow(): ActionRowBuilder<ButtonBuilder> {
    const cancelButton = new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger);
    const closePollButton = new ButtonBuilder()
        .setCustomId('close')
        .setLabel('Close Poll')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents([closePollButton, cancelButton]);

    return row;
}

export const scheduleService = new ScheduleService(pollService, client);
