import { InteractionRouter } from '../interaction-router';
import { SpamProtection } from '../spam/types';
import { Collection, Interaction } from 'discord.js';
import { makeLogger } from '../util/logger';
import { Command } from './types';

const log = makeLogger(module);

export class CommandInteractionRouter extends InteractionRouter {
    private readonly commandsByName = new Collection<string, Command>();

    constructor(private readonly commands: Array<Command>, spamProtection: SpamProtection) {
        super(spamProtection);

        for (const command of this.commands) {
            this.commandsByName.set(command.data.name, command);
        }
    }

    protected override getSpamKey(interaction: Interaction): string {
        const commandName = interaction.isCommand() ? interaction.commandName : '(unknown)';
        return commandName;
    }

    protected override getHandler(
        interaction: Interaction
    ): { execute: (interaction: Interaction, guildConnectionId: number) => Promise<void> } | undefined {
        if (!interaction.isCommand()) {
            log.error('Interaction is not a command type');
            return;
        }

        const commandHandler = this.commandsByName.get(interaction.commandName);
        if (!commandHandler) {
            log.info(`${interaction.commandName} is not supported`);
            return;
        }

        log.info(`Found command handler ${commandHandler.data.name}`);
        return commandHandler;
    }
}
