import { Events } from 'discord.js';
import { config } from './config';
import { commandInteractionRouter } from './commands';
import {
    messageComponentInteractionRouter,
    messageReactAddHandler,
    messageReactRemoveHandler,
} from './message-interactions';
import { makeLogger } from './util/logger';
import { ScheduledMessageProcessor } from './scheduling';
import { client } from './discord-client';
import { guildConnectionService } from './services/guild-connection.service';
import http from 'http';

const log = makeLogger(module);

export async function start(): Promise<void> {
    const port = process.env.HEALTH_PORT || 8080;
    http.createServer((_req, res) => {
        log.debug('received health request');
        res.writeHead(200);
        res.end('ok');
    }).listen(port);

    log.info(`health check running on port: ${port}`);

    client.on(Events.ClientReady, () => {
        const clientUser = client.user;

        if (!clientUser) {
            log.error('ClientReady fired without a client user');
            return;
        }

        log.info({ userId: clientUser.id }, `Client Ready - logged in as ${clientUser.tag}!`);
        config.discordBotUserId = clientUser.id;
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        log.info('Events.InteractionCreate');

        const { guildId } = interaction;

        if (!guildId) {
            log.info('Ignoring interaction outside of a guild');
            return;
        }

        try {
            const { id: guildConnectionId } = await createGuildConnectionIfNeeded({
                guildId,
                userId: interaction.user.id,
                connectionUserUsername: interaction.user.username,
            });

            if (interaction.isChatInputCommand()) await commandInteractionRouter.handle(interaction, guildConnectionId);
            else if (interaction.isMessageComponent())
                await messageComponentInteractionRouter.handle(interaction, guildConnectionId);
        } catch (error) {
            log.error(error, 'Error handling interactions');
        }
    });

    client.on(Events.MessageReactionAdd, async (interaction, reactionUser) => {
        log.info({ reactionUser: reactionUser.username }, 'Events.MessageReactionAdd');

        try {
            await messageReactAddHandler.execute(interaction, reactionUser);
        } catch (error) {
            log.error(error, 'Error handling message reaction');
        }
    });

    client.on(Events.MessageReactionRemove, async (interaction, reactionUser) => {
        log.info({ reactionUser: reactionUser.username }, 'Events.MessageReactionRemove');

        try {
            await messageReactRemoveHandler.execute(interaction, reactionUser);
        } catch (error) {
            log.error(error, 'Error handling message reaction');
        }
    });

    client.login(config.botToken);

    const scheduledMessageProcessor = new ScheduledMessageProcessor(client);
    scheduledMessageProcessor.start();
}

type GuildConnectionInfo = { guildId: string; userId: string; connectionUserUsername: string };
async function createGuildConnectionIfNeeded({ guildId, userId, connectionUserUsername }: GuildConnectionInfo) {
    const guildConnection = await guildConnectionService.getByGuildId(guildId);
    if (!guildConnection) {
        return await guildConnectionService.createGuildConnection({
            connectionUserId: userId,
            guildId: guildId,
            username: connectionUserUsername,
        });
    }

    return guildConnection;
}
