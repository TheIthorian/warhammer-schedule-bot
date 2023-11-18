import { Interaction, SlashCommandBuilder } from 'discord.js';
import { Command } from './types';
import { getInteractionLogDetails } from './interaction-info';
import { logContext, makeLogger } from '../util/logger';

const log = makeLogger(module);

export class PingCommand implements Command {
    private readonly _data: SlashCommandBuilder;

    constructor() {
        this._data = new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!');
    }

    get data() {
        return { name: this._data.name, description: this._data.description };
    }

    async execute(interaction: Interaction): Promise<void> {
        if (!interaction.isChatInputCommand()) return;

        const ctx = logContext(`${PingCommand.name}.${this.execute.name}`, getInteractionLogDetails(interaction));
        log.info(ctx);

        await interaction.reply(`Pong! (This command was run by ${interaction.user.username})`);
    }
}
