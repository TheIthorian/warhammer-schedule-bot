import { CacheType, ChatInputCommandInteraction, SharedSlashCommand, SlashCommandBuilder } from 'discord.js';
import { Command } from './types';
import { getInteractionLogDetails } from '../util/interaction-info';
import { logContext, makeLogger } from '../util/logger';
import { QueryService } from '../services/query.service';

const log = makeLogger(module);

export class QueryCommand implements Command {
    public readonly data: SharedSlashCommand;

    constructor(private readonly queryService: QueryService) {
        this.data = new SlashCommandBuilder()
            .setName('query')
            .setDescription('Answers your questions!')
            .addStringOption((option) =>
                option.setName('input').setDescription('Your question to the AI').setRequired(true),
            )
            .addBooleanOption((option) => option.setName('secret').setDescription('Only you will see the response'));
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
        logContext(`${QueryCommand.name}.${this.execute.name}`, getInteractionLogDetails(interaction), log);

        const questionInput = interaction.options.get('input')?.value?.toString();
        const isSecret = interaction.options.get('secret')?.value || false;

        await interaction.deferReply({ ephemeral: !!isSecret });

        const messageContent = await this.queryService.runQuery(questionInput);

        await interaction.followUp(messageContent);
    }
}
