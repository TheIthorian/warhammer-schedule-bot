import { Events } from 'discord.js';
import { config } from './config';
import { commandInteractionRouter } from './commands';
import { makeLogger } from './util/logger';
import { ScheduledMessageProcessor } from './scheduling';
import { client } from './discord-client';

const log = makeLogger(module);

export async function start() {
    client.on(Events.ClientReady, () => {
        log.info(`Client Ready - logged in as ${client.user?.tag}!`);
    });

    client.on(Events.InteractionCreate, async interaction => {
        try {
            if (interaction.isChatInputCommand()) await commandInteractionRouter.handle(interaction);
            // else if (interaction.isMessageComponent()) await messageComponentInteractionRouter.handle(interaction);
        } catch (error) {
            log.error('Error handling interactions', error);
        }
    });

    client.login(config.botToken);

    const scheduledMessageProcessor = new ScheduledMessageProcessor(client);
    scheduledMessageProcessor.start();
}
