import prisma from '../primsaClient';
import { DateParser } from '../util/date-parser';
import { logContext, makeLogger } from '../util/logger';

const log = makeLogger(module);

export class UserTimezoneService {
    constructor(private readonly dateParser: DateParser) {}

    public async getTimezone(userId: string): Promise<string | null> {
        const record = await prisma.userTimezone.findUnique({ where: { userId } });
        return record?.timezone ?? null;
    }

    /** Stores the user's zone. Returns false without writing if the zone is not a known IANA name. */
    public async setTimezone(userId: string, timezone: string): Promise<boolean> {
        const ctx = logContext(this.setTimezone.name, { userId, timezone }, log);

        if (!this.dateParser.isValidTimezone(timezone)) {
            log.info(`${ctx} rejected unknown timezone`);
            return false;
        }

        await prisma.userTimezone.upsert({
            where: { userId },
            create: { userId, timezone },
            update: { timezone },
        });

        return true;
    }
}

export const userTimezoneService = new UserTimezoneService(new DateParser());
