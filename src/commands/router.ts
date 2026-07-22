import { InteractionHandler, InteractionRouter } from '../interaction-router';
import { SpamProtection } from '../spam/types';
import {
    AutocompleteInteraction,
    CacheType,
    ChatInputCommandInteraction,
    Collection,
    DiscordAPIError,
    RESTJSONErrorCodes,
} from 'discord.js';
import { makeLogger } from '../util/logger';
import { Command } from './types';

const log = makeLogger(module);

/** `Unknown interaction` and `already acknowledged` — both mean this interaction is no longer answerable. */
const SUPERSEDED_INTERACTION_CODES: ReadonlyArray<number> = [
    RESTJSONErrorCodes.UnknownInteraction,
    RESTJSONErrorCodes.InteractionHasAlreadyBeenAcknowledged,
];

function isSupersededInteraction(error: unknown): boolean {
    return error instanceof DiscordAPIError && SUPERSEDED_INTERACTION_CODES.includes(Number(error.code));
}

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

    /**
     * Autocomplete is deliberately kept off the normal `handle` path: these interactions are not repliable, carry
     * no user-visible action to rate limit, and Discord discards the response after 3 seconds.
     */
    async handleAutocomplete(interaction: AutocompleteInteraction<CacheType>): Promise<void> {
        const command = this.commandsByName.get(interaction.commandName);

        if (!command?.autocomplete) {
            log.info(`${interaction.commandName} does not support autocomplete`);
            return;
        }

        try {
            await command.autocomplete(interaction);
        } catch (error) {
            if (isSupersededInteraction(error)) {
                // The user submitted the command, or typed again, while our suggestions were in flight. Discord
                // invalidates the old interaction, so this is expected during normal typing rather than a fault.
                log.debug(`Autocomplete for ${interaction.commandName} was superseded before it could respond`);
                return;
            }

            log.error(error, `Error handling autocomplete for ${interaction.commandName}`);
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
