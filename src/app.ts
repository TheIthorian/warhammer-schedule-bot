import { Client, Events, GatewayIntentBits } from 'discord.js';
import { config } from './config';
import { commandInteractionRouter } from './commands';
import { makeLogger } from './util/logger';

const log = makeLogger(module);

export async function start() {
    const client: Client = new Client({ intents: [GatewayIntentBits.Guilds] });

    client.on(Events.ClientReady, () => {
        log.info(`Client Ready - logged in as ${client.user?.tag}!`);
    });

    client.on(Events.InteractionCreate, async interaction => {
        if (interaction.isChatInputCommand()) await commandInteractionRouter.handle(interaction);
        // else if (interaction.isMessageComponent()) await messageComponentInteractionRouter.handle(interaction);
    });

    client.login(config.botToken);
}
