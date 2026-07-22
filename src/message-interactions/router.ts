import { InteractionRouter } from '../interaction-router';
import { SpamProtection } from '../spam/types';
import { AnySelectMenuInteraction, ButtonInteraction, CacheType } from 'discord.js';
import { makeLogger } from '../util/logger';
import { MessageComponentInteractionHandler } from './types';

const log = makeLogger(module);

type MessageComponentInteraction = AnySelectMenuInteraction<CacheType> | ButtonInteraction<CacheType>;

export class MessageComponentInteractionRouter extends InteractionRouter<MessageComponentInteraction> {
    constructor(
        private readonly interactionHandlers: Record<number, MessageComponentInteractionHandler>,
        spamProtection: SpamProtection,
    ) {
        super(spamProtection);
    }

    protected override getSpamKey(interaction: MessageComponentInteraction): string {
        return interaction.message.id || '(unknown)';
    }

    protected override getHandler(
        interaction: MessageComponentInteraction,
    ): MessageComponentInteractionHandler | undefined {
        const interactionHandler = this.interactionHandlers[interaction.type];

        if (!interactionHandler) {
            log.info(`interaction type {${interaction.type}} is not supported`);
        }

        return interactionHandler;
    }
}
