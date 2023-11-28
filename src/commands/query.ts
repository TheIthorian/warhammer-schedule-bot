import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from './types';
import { getInteractionLogDetails } from '../util/interaction-info';
import { logContext, makeLogger } from '../util/logger';
import { QueryService } from '../services/query.service';

const log = makeLogger(module);

export class QueryCommand implements Command {
    public readonly data: SlashCommandBuilder;

    constructor(private readonly queryService: QueryService) {
        this.data = new SlashCommandBuilder()
            .setName('query')
            .setDescription('Answers your questions!')
            .addStringOption(option =>
                option.setName('input').setDescription('Your question to the AI').setRequired(true)
            )
            .setName('query');
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
        logContext(`${QueryCommand.name}.${this.execute.name}`, getInteractionLogDetails(interaction), log);

        await interaction.deferReply({ ephemeral: false });

        const questionInput = interaction.options.get('input').value?.toString();

        const messageContent = await this.queryService.runQuery(questionInput);

        await interaction.followUp(messageContent);
    }
}
