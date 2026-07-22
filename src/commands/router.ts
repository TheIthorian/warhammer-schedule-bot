import { InteractionHandler, InteractionRouter } from '../interaction-router';
import { SpamProtection } from '../spam/types';
import { CacheType, ChatInputCommandInteraction, Collection } from 'discord.js';
import { makeLogger } from '../util/logger';
import { Command } from './types';

const log = makeLogger(module);

export class CommandInteractionRouter extends InteractionRouter<ChatInputCommandInteraction<CacheType>> {
    private readonly commandsByName = new Collection<string, Command>();

    constructor(
        private readonly commands: Array<Command>,
        spamProtection: SpamProtection,
    ) {
        super(spamProtection);

        for (const command of this.commands) {
            this.commandsByName.set(command.data.name, command);
        }
    }

    protected override getSpamKey(interaction: ChatInputCommandInteraction<CacheType>): string {
        return interaction.commandName;
    }

    protected override getHandler(
        interaction: ChatInputCommandInteraction<CacheType>,
    ): InteractionHandler<ChatInputCommandInteraction<CacheType>> | undefined {
        const commandHandler = this.commandsByName.get(interaction.commandName);
        if (!commandHandler) {
            log.info(`${interaction.commandName} is not supported`);
            return;
        }

        log.info(`Found command handler ${commandHandler.data.name}`);
        return commandHandler;
    }
}
