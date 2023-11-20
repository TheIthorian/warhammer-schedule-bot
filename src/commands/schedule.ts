import { PollResultsFormatter } from './../scheduling/types';
import { PartyScheduler } from './../scheduling/party-scheduler';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
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

    constructor(
        private readonly partyScheduler: PartyScheduler,
        private readonly pollResultsFormatter: PollResultsFormatter
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

        const guildId = interaction.guildId;

        // Already in progress
        if (this.partyScheduler.isExistScheduleInProgress(guildId)) {
            log.info(`${ctx} scheduling is already in progress`);
            return await this.sendScheduleInProgressMessage(interaction);
        }

        // Start scheduling
        const { daySelectCollector, buttonCollector, response, handleFinishPoll } = await this.sendSchedulingMessage(
            interaction
        );
        const { id: messageId, url: messageUrl } = await response.fetch();

        this.partyScheduler.addSchedulingMessage(guildId, messageId, messageUrl);

        // Collect responses
        daySelectCollector.on('collect', async collectionResponse => {
            try {
                await this.handleCollectDay(collectionResponse, interaction, { messageId, guildId });
            } catch (err) {
                log.error(`${ctx} error collecting day select response ${err}`);
                console.error(err);
            }
        });

        buttonCollector.once('collect', async collectionResponse => {
            try {
                const wasCancelled = collectionResponse.customId === 'cancel';
                if (wasCancelled) {
                    log.info(`${ctx} collected response from ${collectionResponse.user.id} to cancel poll`);
                    await collectionResponse.reply(`${collectionResponse.user} has cancelled the poll`);
                } else {
                    log.info(`${ctx} collected response from ${collectionResponse.user.id} to close poll`);
                    await collectionResponse.reply(`${collectionResponse.user} has closed the poll`);
                }

                buttonCollector.stop();
                handleFinishPoll();

                const results = this.partyScheduler.closeSchedule(guildId);
                const formattedResults = this.pollResultsFormatter.format(results);

                await interaction.followUp(
                    `The poll was ${wasCancelled ? 'cancelled' : 'closed'}.\n${formattedResults}`
                );
            } catch (err) {
                log.error(`${ctx} error collecting cancel button response ${err}`);
                console.error(err);
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
        daySelectCollector: InteractionCollector<StringSelectMenuInteraction<CacheType>>;
        buttonCollector: InteractionCollector<ButtonInteraction<CacheType>>;
        response: InteractionResponse<boolean>;
        handleFinishPoll: () => void;
    }> {
        const select = new StringSelectMenuBuilder()
            .setCustomId('scheduler')
            .setPlaceholder('Make a selection!')
            .setMinValues(0)
            .setMaxValues(7)
            .addOptions(DAYS_OF_THE_WEEK.map(day => new StringSelectMenuOptionBuilder().setLabel(day).setValue(day)));
        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

        const cancelButton = new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger);
        const closePollButton = new ButtonBuilder()
            .setCustomId('close')
            .setLabel('Close Poll')
            .setStyle(ButtonStyle.Secondary);
        const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents([closePollButton, cancelButton]);

        const pollCreationText = 'Hey @everyone 👋 Please select the days that you are available next week';
        const response = await interaction.reply({
            content: pollCreationText,
            components: [row, row2],
        });

        const daySelectCollector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: TIME_TO_REACT_MINUTES * 60 * 1_000,
        });

        const buttonCollector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: TIME_TO_REACT_MINUTES * 60 * 1_000,
        });

        const handleFinishPoll = () => {
            row.components.forEach(c => c.setDisabled(true));
            interaction.editReply({ components: [row], content: `${pollCreationText}\n(this poll has ended)` });
        };

        return { daySelectCollector, buttonCollector, response, handleFinishPoll };
    }

    private async handleCollectDay(
        collectionResponse: StringSelectMenuInteraction<CacheType>,
        interaction: ChatInputCommandInteraction<CacheType>,
        { messageId, guildId }: { messageId: string; guildId: string }
    ) {
        const ctx = logContext(`${ScheduleCommand.name}.${this.handleCollectDay.name}`);
        log.info(`${ctx} collected response from ${collectionResponse.user.id} for message ${messageId}`);

        const userScheduleResponse: ScheduleResponse = {
            days: collectionResponse.values,
            userId: collectionResponse.user.id,
            responseTime: collectionResponse.createdTimestamp,
        };

        await collectionResponse.reply({
            content: `You have selected ${userScheduleResponse.days.join(', ')}!`,
            ephemeral: true,
        });

        this.partyScheduler.addResponse(guildId, userScheduleResponse);

        if (this.partyScheduler.hasEveryoneResponded(guildId, interaction.guild.memberCount)) {
            log.info(`${ctx} scheduling is finished`);
            await interaction.followUp({
                content: 'Everyone has replied! You may close the poll',
            });
        }
    }
}
