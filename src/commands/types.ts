import { CacheType, ChatInputCommandInteraction, SharedSlashCommand } from 'discord.js';

export interface Command {
    data: SharedSlashCommand;
    execute(interaction: ChatInputCommandInteraction<CacheType>, guildConnectionId: number): Promise<void>;
}
