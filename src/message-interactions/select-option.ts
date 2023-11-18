import { AnySelectMenuInteraction, CacheType, ButtonInteraction } from 'discord.js';
import { MessageComponentInteractionHandler } from './types';

export class SelectOptionInteraction implements MessageComponentInteractionHandler {
    execute(interaction: AnySelectMenuInteraction<CacheType> | ButtonInteraction<CacheType>): Promise<void> {
        return Promise.resolve();
    }
}
