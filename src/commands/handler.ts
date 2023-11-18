import { SpamProtection } from './../spam/types';
import { CacheType, ChatInputCommandInteraction, Collection, Interaction } from 'discord.js';
import { logContext, makeLogger } from '../util/logger';
import { Command } from './types';

const log = makeLogger(module);

export class InteractionHandler {
    private readonly commandsByName = new Collection<string, Command>();

    constructor(private readonly commands: Array<Command>, private readonly spamProtection: SpamProtection) {
        for (const command of this.commands) {
            this.commandsByName.set(command.data.name, command);
        }
    }

    async handle(interaction: Interaction): Promise<void> {
        if (!interaction.isChatInputCommand()) return;
        const ctx = logContext(`${InteractionHandler.name}.${this.handle.name}`, {});

        const command = this.commandsByName.get(interaction.commandName);

        if (!command) {
            log.info(`${ctx} ${interaction.commandName} is not supported`);
            return;
        }

        const spamValidationResult = this.spamProtection.getSpamValidation(command.data.name, interaction.user.id);
        if (spamValidationResult.ok === false) {
            log.info(`${ctx} user hit spam limit for ${interaction.commandName}`);
            await this.handleSpamError(interaction, spamValidationResult.message);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            log.error(`${ctx}`, error);
            await this.handleError(interaction);
        }
    }

    private async handleSpamError(interaction: ChatInputCommandInteraction<CacheType>, message: string) {
        await this.respond(interaction, message);
    }

    private async handleError(interaction: ChatInputCommandInteraction<CacheType>) {
        await this.respond(interaction, 'There was an error while executing this command!');
    }

    private async respond(interaction: ChatInputCommandInteraction<CacheType>, content: string) {
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
