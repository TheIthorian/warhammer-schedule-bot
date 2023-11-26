import { InteractionRouter } from '../interaction-router';
import { SpamProtection } from '../spam/types';
import { Interaction } from 'discord.js';
import { makeLogger } from '../util/logger';
import { MessageComponentInteractionHandler } from './types';

const log = makeLogger(module);

export class MessageComponentInteractionRouter extends InteractionRouter {
    constructor(
        private readonly interactionHandlers: Record<number, MessageComponentInteractionHandler>,
        spamProtection: SpamProtection
    ) {
        super(spamProtection);
    }

    protected override getSpamKey(interaction: Interaction): string {
        return (interaction.isMessageComponent() && interaction.message.id) || '(unknown)';
    }

    protected override getHandler(interaction: Interaction): { execute: (interaction: Interaction) => Promise<void> } {
        const interactionHandler = this.interactionHandlers[interaction.type];

        if (!interactionHandler) {
            log.info(`interaction type {${interaction.type}} is not supported`);
        }

        return interactionHandler;
    }
}
