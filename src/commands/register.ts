import { REST, Routes } from 'discord.js';
import { commands } from './index';
import { config } from '../config';
import { makeLogger } from '../util/logger';

const log = makeLogger(module);

/**
 * Registers the full command set with Discord. `put` replaces whatever is registered, so this is idempotent and
 * also prunes commands that have been removed from the `commands` array.
 */
export async function registerCommands(): Promise<void> {
    const rest = new REST({ version: '10' }).setToken(config.botToken);

    log.info(`Registering ${commands.length} application commands`);

    await rest.put(Routes.applicationCommands(config.clientId), {
        body: commands.map((command) => command.data),
    });

    log.info('Successfully registered application commands');
}
