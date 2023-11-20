import { randomUUID } from 'crypto';
import { Client } from 'discord.js';
import schedule from 'node-schedule'; // https://www.npmjs.com/package/node-schedule
import { logContext, makeLogger } from '../util/logger';

const log = makeLogger(module);

export class JobScheduler {
    private readonly jobs = new Map<string, schedule.Job>();
    private discordClient: Client;

    public scheduleJob(date: Date, callback: ({ client }: { client: Client }) => Promise<void>): string {
        const ctx = logContext(`${JobScheduler.name}.${this.scheduleJob.name}`, { date });

        const id = randomUUID();
        const job = schedule.scheduleJob(id, date, () => this.handleJobCallback(callback));
        this.jobs.set(id, job);

        log.info(`${ctx} job scheduled for ${date.toISOString()}`);

        return id;
    }

    public cancelJob(id: string): void {
        const job = this.jobs.get(id);
        if (job) job.cancel();
    }

    public setDiscordClient(client: Client) {
        this.discordClient = client;
    }

    private async handleJobCallback(callback: ({ client }: { client: Client }) => Promise<void>) {
        const ctx = logContext(`${JobScheduler.name}.${this.handleJobCallback.name}`);
        try {
            await callback({ client: this.discordClient });
        } catch (err) {
            log.error(`${ctx} error handling job callback: ${err}`);
        }
    }
}
