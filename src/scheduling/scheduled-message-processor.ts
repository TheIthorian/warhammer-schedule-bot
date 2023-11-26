import { Client } from 'discord.js';
import schedule from 'node-schedule'; // https://www.npmjs.com/package/node-schedule
import { logContext, makeLogger } from '../util/logger';
import prisma from '../primsaClient';

const log = makeLogger(module);

type ScheduledMessageDetails = {
    id: number;
    messageContent: string;
    channelId: string;
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
        schedule.scheduleJob('*/5 * * * *', async () => {
            log.info('processing scheduled message');
            try {
                await this.processMessages();
            } catch (error) {
                log.error(`error when processing schedule messages`, error);
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
                log.error(`error sending message (${message.id})`, error);
                await this.setMessageToFailed(message.id);
            }
        }

        log.info('Updating messages to "processed" status');
        await this.setMessageToProcessed(processedIds);
    }

    private async getMessagesToProcess(): Promise<ScheduledMessageDetails[]> {
        return prisma.scheduledMessage.findMany({
            select: { id: true, messageContent: true, channelId: true },
            where: { scheduledDate: { lt: new Date() }, status: 'pending' },
            orderBy: { id: 'asc' },
        });
    }

    private async processMessage({ id, messageContent, channelId }: ScheduledMessageDetails): Promise<void> {
        logContext(this.processMessage.name, { id, channelId }, log);

        const channel = await this.discordClient.channels.fetch(channelId);
        if (channel.isTextBased()) {
            await channel.send(messageContent);
        }
    }

    private async setMessageToFailed(id: number): Promise<void> {
        try {
            await prisma.scheduledMessage.update({ where: { id }, data: { status: 'failed' } });
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
