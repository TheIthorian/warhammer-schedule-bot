import { Interaction, SlashCommandBuilder } from 'discord.js';
import { Command } from './types';

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
        await interaction.reply(`Pong! (This command was run by ${interaction.user.username})`);
    }
}
