import { time } from 'discord.js';
import moment from 'moment-timezone';
import prisma from '../primsaClient';
import { DateParser } from '../util/date-parser';
import { logContext, makeLogger } from '../util/logger';

type AddReminderInput = {
    date: Date;
    guildConnectionId: number;
    channelId: string;
    timezone: string;
};

const HOUR_IN_MS = 60 * 60 * 1000;

type GetDateAndResponseFromCommandInputOutput =
    | { inputDate: Date; responseContent: string; isSuccess: false }
    | { inputDate: Date; isSuccess: true };

const log = makeLogger(module);

export class ReminderService {
    constructor(private readonly dateParser: DateParser) {}

    public getDateAndResponseFromCommandInput(
        inputDateString: string,
        timezone: string,
    ): GetDateAndResponseFromCommandInputOutput {
        const ctx = logContext(this.getDateAndResponseFromCommandInput.name, { inputDateString, timezone }, log);

        const inputDate = this.dateParser.parseNative(inputDateString, timezone);

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
        const { guildConnectionId, channelId, date, timezone } = input;

        // 10am on the session's local calendar day. `setHours` would have used the host zone (UTC on Railway),
        // which both picks the wrong hour and, near midnight, the wrong day.
        const dayReminder = moment.tz(date, timezone).startOf('day').hour(10).toDate();

        // An hour before kickoff is an absolute offset, so no zone maths is needed.
        const hourReminder = new Date(date.getTime() - HOUR_IN_MS);

        await prisma.$transaction([
            prisma.scheduledMessage.create({
                data: {
                    guildConnectionId,
                    messageContent: `Hey @everyone 👋 don't forget we have our session today at ${time(date, 't')}`,
                    scheduledDate: dayReminder,
                    channelId,
                    status: 'pending',
                },
            }),
            prisma.scheduledMessage.create({
                data: {
                    guildConnectionId,
                    messageContent: `Hey @everyone 👋 Today's session will be starting in ${time(date, 'R')}`,
                    scheduledDate: hourReminder,
                    channelId,
                    status: 'pending',
                },
            }),
        ]);
    }
}

export const reminderService = new ReminderService(new DateParser());
