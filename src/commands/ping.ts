import { Interaction, SlashCommandBuilder } from 'discord.js';
import { Command } from './types';
import { getInteractionLogDetails } from './interaction-info';
import { logContext, makeLogger } from '../util/logger';

const log = makeLogger(module);

export class PingCommand implements Command {
    public readonly data: SlashCommandBuilder;

    constructor() {
        this.data = new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!');
    }

    async execute(interaction: Interaction): Promise<void> {
        if (!interaction.isChatInputCommand()) return;

        const ctx = logContext(`${PingCommand.name}.${this.execute.name}`, getInteractionLogDetails(interaction));
        log.info(ctx);

        await interaction.reply(`Pong! (This command was run by ${interaction.user.username})`);
    }
}
