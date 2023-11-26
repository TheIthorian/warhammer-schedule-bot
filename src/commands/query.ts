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
            .setName('query')
            .setDescription('Answers your questions!')
            .addStringOption(option =>
                option.setName('input').setDescription('Your question to the AI').setRequired(true)
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

        const url = `${config.aiService.url}/query/${interaction.options.get('input').value}`;
        const response = await fetch(url, {
            headers: { api: config.aiService.apiKey! },
        });

        const queryResponse = await response.text();

        log.info(`${ctx} - query to: ${url}`);

        await interaction.reply({
            content: queryResponse.substring(0, 1900) + (queryResponse.length > 1900 ? '...' : ''),
            ephemeral: true,
        });
    }
}
