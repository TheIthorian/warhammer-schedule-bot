import { ChannelType, Client } from 'discord.js';
import schedule from 'node-schedule'; // https://www.npmjs.com/package/node-schedule
import { logContext, makeLogger } from '../util/logger';
import prisma from '../primsaClient';

const log = makeLogger(module);

type ScheduledMessageDetails = {
    id: number;
    messageContent: string;
    channelId: string;
    status: string;
    retryCount: number;
};

/**
 * Asynchronous processing of scheduled messages.
 * Check every 5 minutes for any scheduled messages. Sends messages when scheduled time has elapsed.
 */
export class ScheduledMessageProcessor {
    constructor(private readonly discordClient: Client) {}

    /**
     * Activates the message processing
     */
    public start() {
        schedule.scheduleJob('5,35 * * * *', async () => {
            log.info('processing scheduled message');
            try {
                await this.processMessages();
            } catch (error) {
                log.error(error, `error when processing schedule messages`);
                console.error(error);
            }
        });
    }

    public async processMessages() {
        log.info('Processing messages');

        const messages = await this.getMessagesToProcess();
        log.info(`Found ${messages.length} to process`);

        const processedIds: number[] = [];
        for (const message of messages) {
            try {
                await this.processMessage(message);
                processedIds.push(message.id);
            } catch (error) {
                log.error(error, `error sending message (${message.id})`);
                await this.processFailedMessage(message);
            }
        }

        log.info('Updating messages to "processed" status');
        await this.setMessageToProcessed(processedIds);
    }

    private async getMessagesToProcess(): Promise<ScheduledMessageDetails[]> {
        return prisma.scheduledMessage.findMany({
            select: { id: true, messageContent: true, channelId: true, status: true, retryCount: true },
            where: { scheduledDate: { lt: new Date() }, status: { in: ['pending', 'retry'] } },
            orderBy: { id: 'asc' },
        });
    }

    private async processMessage({ id, messageContent, channelId }: ScheduledMessageDetails): Promise<void> {
        logContext(this.processMessage.name, { id, channelId }, log);

        const channel = await this.discordClient.channels.fetch(channelId);

        // PartialGroupDMChannel is text based but has no `send` method.
        if (!channel || !channel.isTextBased() || channel.type === ChannelType.GroupDM) {
            log.error({ id, channelId }, 'Channel not found or is not a sendable text channel');
            return;
        }

        await channel.send(messageContent);
    }

    private async processFailedMessage({ id, retryCount }: ScheduledMessageDetails): Promise<void> {
        try {
            if (retryCount > 2) {
                await prisma.scheduledMessage.update({ where: { id }, data: { status: 'failed' } });
            } else {
                await prisma.scheduledMessage.update({
                    where: { id },
                    data: { status: 'retry', retryCount: retryCount + 1 },
                });
            }
        } catch (error) {
            log.error(`Error updating schedule ${id} setting status to failed`);
        }
    }

    private async setMessageToProcessed(ids: number[]): Promise<void> {
        try {
            await prisma.scheduledMessage.updateMany({ where: { id: { in: ids } }, data: { status: 'processed' } });
        } catch (error) {
            log.error(`Error updating schedules setting status to processed`);
        }
    }
}
