import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from './types';
import { getInteractionLogDetails } from '../util/interaction-info';
import { logContext, makeLogger } from '../util/logger';
import { config } from '../config';

const log = makeLogger(module);

const MY_USER_ID = '207441971017547776';

export class QueryCommand implements Command {
    public readonly data: SlashCommandBuilder;

    constructor() {
        this.data = new SlashCommandBuilder()
            .setDescription('Answers your questions!')
            .addStringOption(option =>
                option.setName('queryInput').setDescription('Your question to the AI').setRequired(true)
            )
            .setName('query');
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
        const ctx = logContext(`${QueryCommand.name}.${this.execute.name}`, getInteractionLogDetails(interaction), log);

        if (interaction.user.id !== MY_USER_ID) {
            log.info(`${ctx} not my user!`);
            await interaction.reply({ content: 'This command is not active for you', ephemeral: true });
            return;
        }

        const response = await fetch(`${config.aiService.url}/query/${interaction.options.get('queryInput')}`, {
            headers: { api: config.aiService.apiKey! },
        });

        await interaction.reply(await response.text());
    }
}
