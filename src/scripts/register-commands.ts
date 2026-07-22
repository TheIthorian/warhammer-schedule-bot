import { commands } from '../commands';
import { config } from '../config';
import { REST, Routes } from 'discord.js';

export async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(config.botToken);

    try {
        console.log('Started refreshing application commands.');

        await rest.put(Routes.applicationCommands(config.clientId), {
            body: commands.map((command) => command.data),
        });

        console.log('Successfully reloaded application commands.');
    } catch (error) {
        console.error(error);
    }
}

if (require.main === module) {
    registerCommands();
}
