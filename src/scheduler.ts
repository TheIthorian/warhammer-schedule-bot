import { randomUUID } from 'crypto';
import schedule from 'node-schedule'; // https://www.npmjs.com/package/node-schedule

export class Scheduler {
    private readonly jobs = new Map<string, schedule.Job>();

    public scheduleJob(date: Date, callback: CallableFunction): string {
        const id = randomUUID();
        const job = schedule.scheduleJob(id, date, () => callback());
        this.jobs.set(job.name, job);
        return id;
    }

    public cancelJob(id: string): void {
        const job = this.jobs.get(id);
        if (job) job.cancel();
    }
}
