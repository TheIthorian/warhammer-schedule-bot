import { CacheType, ChatInputCommandInteraction, Collection, Interaction } from 'discord.js';
import { logContext, makeLogger } from '../util/logger';
import { Command } from './types';

const log = makeLogger(module);

export class InteractionHandler {
    private readonly commandsByName = new Collection<string, Command>();

    constructor(private readonly commands: Array<Command>) {
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

        try {
            await command.execute(interaction);
        } catch (error) {
            log.error(`${ctx}`, error);
            await this.handleError(interaction);
        }
    }

    private async handleError(interaction: ChatInputCommandInteraction<CacheType>) {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: 'There was an error while executing this command!',
                ephemeral: true,
            });
            return;
        }

        await interaction.reply({
            content: 'There was an error while executing this command!',
            ephemeral: true,
        });
    }
}
