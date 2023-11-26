import { PollResultsFormatter } from './../scheduling/types';
import { PollService } from '../services/poll-service';
import {
    ButtonInteraction,
    CacheType,
    ChatInputCommandInteraction,
    ComponentType,
    InteractionCollector,
    InteractionResponse,
    SlashCommandBuilder,
} from 'discord.js';
import { Command } from './types';
import { getInteractionLogDetails } from '../util/interaction-info';
import { logContext, makeLogger } from '../util/logger';
import { GuildConnectionService } from '../services/guild-connection';
import { ScheduleService } from '../scheduling/schedule-service';

const log = makeLogger(module);

const TIME_TO_REACT_MINUTES = 60;

export class ScheduleCommand implements Command {
    public readonly data: SlashCommandBuilder;

    constructor(
        private readonly partyScheduler: PollService,
        private readonly pollResultsFormatter: PollResultsFormatter,
        private readonly guildConnectionService: GuildConnectionService,
        private readonly scheduleService: ScheduleService
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

        const { guildId, user, channelId } = interaction;
        const { id: guildConnectionId } = await this.guildConnectionService.getByGuildId(guildId);

        // Already in progress
        const validatePollInProgressResult = await this.scheduleService.validatePollInProgress(guildConnectionId);
        if (validatePollInProgressResult.inProgress === true) {
            log.info(`${ctx} scheduling is already in progress`);
            await interaction.reply(validatePollInProgressResult.reply);
            return;
        }

        // Start scheduling
        const { buttonCollector, response, handleFinishPoll } = await this.sendSchedulingMessage(interaction);
        const { id: messageId, url: messageUrl } = await response.fetch();

        const newPoll = await this.partyScheduler.createPoll({
            messageId,
            channelId,
            userId: user.id,
            guildConnectionId,
            messageUrl,
        });

        buttonCollector.once('collect', async collectionResponse => {
            try {
                buttonCollector.stop();
                handleFinishPoll(channelId, newPoll.messageId);

                const results = await this.partyScheduler.closePoll(guildConnectionId);
                const formattedResults = this.pollResultsFormatter.format(results);

                const wasCancelled = collectionResponse.customId === 'cancel';
                if (wasCancelled) {
                    log.info(`${ctx} collected response from ${collectionResponse.user.id} to cancel poll`);
                    await collectionResponse.reply(`${collectionResponse.user} has cancelled the poll`);
                    return;
                } else {
                    log.info(`${ctx} collected response from ${collectionResponse.user.id} to close poll`);
                    await collectionResponse.reply(`${collectionResponse.user} has closed the poll`);
                }

                await interaction.followUp(
                    `The poll was ${wasCancelled ? 'cancelled' : 'closed'}.\n${formattedResults}`
                );
            } catch (err) {
                log.error(`${ctx} error collecting cancel button response ${err}`);
                console.error(err);
            }
        });
    }

    private async sendSchedulingMessage(interaction: ChatInputCommandInteraction<CacheType>): Promise<{
        buttonCollector: InteractionCollector<ButtonInteraction<CacheType>>;
        response: InteractionResponse<boolean>;
        handleFinishPoll: (channelId: string, messageId: string) => void;
    }> {
        const schedulingMessageComponents = this.scheduleService.getSchedulingMessageComponents();
        const response = await interaction.reply(schedulingMessageComponents);

        const buttonCollector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: TIME_TO_REACT_MINUTES * 60 * 1_000,
        });

        const handleFinishPoll = async (channelId: string, messageId: string) => {
            await this.scheduleService.disablePoll(channelId, messageId);
        };

        return { buttonCollector, response, handleFinishPoll };
    }
}
