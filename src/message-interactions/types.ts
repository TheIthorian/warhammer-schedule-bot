import { AnySelectMenuInteraction, ButtonInteraction, CacheType } from 'discord.js';

export interface MessageComponentInteractionHandler {
    execute(
        interaction: AnySelectMenuInteraction<CacheType> | ButtonInteraction<CacheType>,
        guildConnectionId: number
    ): Promise<void>;
}
