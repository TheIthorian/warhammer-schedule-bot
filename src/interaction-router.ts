import { Interaction } from 'discord.js';
import { SpamProtection } from './spam/types';

import { logContext, makeLogger } from './util/logger';
import { getInteractionLogDetails } from './util/interaction-info';

const log = makeLogger(module);

export abstract class InteractionRouter {
    constructor(private readonly spamProtection: SpamProtection) {}

    async handle(interaction: Interaction, guildConnectionId: number): Promise<void> {
        const ctx = logContext(`${InteractionRouter.name}.${this.handle.name}`, getInteractionLogDetails(interaction));

        const spamKey = this.getSpamKey(interaction);

        const spamValidationResult = this.spamProtection.getSpamValidation(spamKey, interaction.user.id);
        if (spamValidationResult.ok === false) {
            log.info(`${ctx} user hit spam limit for ${spamKey}`);
            await this.handleSpamError(interaction, spamValidationResult.message);
            return;
        }

        const interactionHandler = this.getHandler(interaction);
        if (!interactionHandler) {
            log.info(`${ctx} No interaction handler`);
            return;
        }

        try {
            log.info(`${ctx} interaction handler found`);
            await interactionHandler.execute(interaction, guildConnectionId);
        } catch (error) {
            log.error(`${ctx}`, error);
            console.error(error);
            await this.handleError(interaction);
        }
    }

    protected abstract getSpamKey(interaction: Interaction): string;

    protected abstract getHandler(interaction: Interaction): {
        execute: (interaction: Interaction, guildConnectionId: number) => Promise<void>;
    };

    protected async handleSpamError(interaction: Interaction, message: string) {
        await this.respond(interaction, message);
    }

    protected async handleError(interaction: Interaction) {
        await this.respond(interaction, 'There was an error while executing this command!');
    }

    protected async respond(interaction: Interaction, content: string) {
        if (!interaction.isRepliable()) return;

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content, ephemeral: true });
            return;
        }

        await interaction.reply({ content, ephemeral: true });
    }
}
