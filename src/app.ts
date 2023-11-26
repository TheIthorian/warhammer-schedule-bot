import { Events, Interaction } from 'discord.js';
import { config } from './config';
import { commandInteractionRouter } from './commands';
import { messageComponentInteractionRouter } from './message-interactions';
import { makeLogger } from './util/logger';
import { ScheduledMessageProcessor } from './scheduling';
import { client } from './discord-client';
import { guildConnectionService } from './services/guild-connection.service';

const log = makeLogger(module);

export async function start() {
    client.on(Events.ClientReady, () => {
        log.info(`Client Ready - logged in as ${client.user?.tag}!`);
    });

    client.on(Events.InteractionCreate, async interaction => {
        try {
            const { id: guildConnectionId } = await createGuildConnectionIfNeeded(interaction);
            if (interaction.isChatInputCommand()) await commandInteractionRouter.handle(interaction, guildConnectionId);
            else if (interaction.isMessageComponent())
                await messageComponentInteractionRouter.handle(interaction, guildConnectionId);
        } catch (error) {
            log.error('Error handling interactions', error);
        }
    });

    client.login(config.botToken);

    const scheduledMessageProcessor = new ScheduledMessageProcessor(client);
    scheduledMessageProcessor.start();
}

async function createGuildConnectionIfNeeded(interaction: Interaction) {
    const guildConnection = await guildConnectionService.getByGuildId(interaction.guildId);
    if (!guildConnection) {
        return await guildConnectionService.createGuildConnection({
            connectionUserId: interaction.user.id,
            guildId: interaction.guildId,
            username: interaction.user.username,
        });
    }

    return guildConnection;
}
