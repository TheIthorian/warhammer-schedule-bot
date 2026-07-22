import { AutocompleteInteraction, CacheType, ChatInputCommandInteraction, SharedSlashCommand } from 'discord.js';

export interface Command {
    data: SharedSlashCommand;
    execute(interaction: ChatInputCommandInteraction<CacheType>, guildConnectionId: number): Promise<void>;

    /** Implemented only by commands with an autocompleting option. Must respond within Discord's 3 second window. */
    autocomplete?(interaction: AutocompleteInteraction<CacheType>): Promise<void>;
}
