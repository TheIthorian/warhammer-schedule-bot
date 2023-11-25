import { time } from 'discord.js';
import prisma from '../../primsaClient';
import { DateParser } from '../../util/date-parser';
import { logContext, makeLogger } from '../../util/logger';

type AddReminderInput = {
    date: Date;
    guildId: string;
    channelId: string;
};

type GetDateAndResponseFromCommandInputOutput =
    | { inputDate: Date; responseContent: string; isSuccess: false }
    | { inputDate: Date; isSuccess: true };

const log = makeLogger(module);

export class ReminderService {
    constructor(private readonly dateParser: DateParser) {}

    public getDateAndResponseFromCommandInput(inputDateString: string): GetDateAndResponseFromCommandInputOutput {
        const ctx = logContext(this.getDateAndResponseFromCommandInput.name, { inputDateString }, log);

        const inputDate = this.dateParser.parseNative(inputDateString);

        if (isNaN(inputDate.getTime())) {
            log.info(`${ctx} invalid date input: ${inputDateString}`);
            return {
                inputDate,
                responseContent: `${inputDateString} is not a valid date. Please use the format: DD/MM/YY HH:MM:SS`,
                isSuccess: false,
            };
        }

        const now = new Date();
        if (inputDate.getTime() < now.getTime()) {
            log.info(`${ctx} date in the past ${inputDateString}. Currently ${now}`);
            return {
                inputDate,
                responseContent: `${inputDateString} is in the past. Please choose a date in the future, using the format: DD/MM/YY HH:MM:SS`,
                isSuccess: false,
            };
        }

        return {
            inputDate,
            isSuccess: true,
        };
    }

    public async addReminder(input: AddReminderInput): Promise<void> {
        const { guildId, channelId, date } = input;

        const guildConnection = await prisma.guildConnection.findFirstOrThrow({
            select: { id: true },
            where: { guildId },
        });

        const dayReminder = new Date(date);
        dayReminder.setHours(10, 0, 0, 0);

        const hourReminder = new Date(date);
        hourReminder.setHours(date.getHours() - 1);

        await prisma.$transaction([
            prisma.scheduledMessage.create({
                data: {
                    guildConnectionId: guildConnection.id,
                    messageContent: `Hey @everyone 👋 don't forget we have our session today at ${time(date, 't')}`,
                    scheduledDate: dayReminder,
                    channelId,
                },
            }),
            prisma.scheduledMessage.create({
                data: {
                    guildConnectionId: guildConnection.id,
                    messageContent: `Hey @everyone 👋 Today's session will be starting in ${time(date, 'R')}`,
                    scheduledDate: hourReminder,
                    channelId,
                },
            }),
        ]);
    }
}
