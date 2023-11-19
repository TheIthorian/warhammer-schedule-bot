import { InteractionRouter } from '../types';
import { SpamProtection } from '../spam/types';
import { AnySelectMenuInteraction, ButtonInteraction, CacheType, Collection } from 'discord.js';
import { logContext, makeLogger } from '../util/logger';
import { MessageComponentInteractionHandler } from './types';

const log = makeLogger(module);

export class MessageComponentInteractionRouter implements InteractionRouter {
    constructor(
        private readonly interactionHandlers: Array<MessageComponentInteractionHandler>,
        private readonly spamProtection: SpamProtection
    ) {}

    async handle(interaction: AnySelectMenuInteraction<CacheType> | ButtonInteraction<CacheType>): Promise<void> {
        const ctx = logContext(`${MessageComponentInteractionRouter.name}.${this.handle.name}`, {
            componentType: interaction.componentType,
        });

        const messageId = interaction.message.id;
        const interactionHandler = this.interactionHandlers[0];

        const spamValidationResult = this.spamProtection.getSpamValidation(messageId, interaction.user.id);
        if (spamValidationResult.ok === false) {
            log.info(`${ctx} user hit spam limit for ${messageId}`);
            await this.handleSpamError(interaction, spamValidationResult.message);
            return;
        }
        log.info(`${ctx} spam validation passed`);

        try {
            log.info(`${ctx} executing handler`);
            await interactionHandler.execute(interaction);
        } catch (error) {
            log.error(`${ctx}`, error);
            console.error(error);
            await this.handleError(interaction);
        }
    }

    private async handleSpamError(
        interaction: AnySelectMenuInteraction<CacheType> | ButtonInteraction<CacheType>,
        message: string
    ) {
        await this.respond(interaction, message);
    }

    private async handleError(interaction: AnySelectMenuInteraction<CacheType> | ButtonInteraction<CacheType>) {
        await this.respond(interaction, 'There was an error while executing this command!');
    }

    private async respond(
        interaction: AnySelectMenuInteraction<CacheType> | ButtonInteraction<CacheType>,
        content: string
    ) {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content,
                ephemeral: true,
            });
            return;
        }

        await interaction.reply({
            content,
            ephemeral: true,
        });
    }
}
