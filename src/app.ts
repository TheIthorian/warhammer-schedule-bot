import { Client, Events, GatewayIntentBits } from 'discord.js';
import { config } from './config';
import { interactionHandler } from './commands';
import { makeLogger } from 'util/logger';

const log = makeLogger(module);

export async function start() {
    const client: Client = new Client({ intents: [GatewayIntentBits.Guilds] });

    client.on(Events.ClientReady, () => {
        log.info(`Client Ready - logged in as ${client.user?.tag}!`);
    });

    client.on(Events.InteractionCreate, async interaction => {
        await interactionHandler.handle(interaction);
    });

    client.login(config.botToken);
}
