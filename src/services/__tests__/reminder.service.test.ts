import { ReminderService } from '../reminder.service';
import { DateParser } from '../../util/date-parser';
import prisma from '../../primsaClient';
import { randomUUID } from 'crypto';
import { time } from 'discord.js';

type InvalidDateResponse = { inputDate: Date; responseContent: string; isSuccess: false };

describe('ReminderService', () => {
    const dateParser = new DateParser();

    describe('getDateAndResponseFromCommandInput', () => {
        const reminderService = new ReminderService(dateParser);

        test('should handle invalid date input', () => {
            const result = reminderService.getDateAndResponseFromCommandInput('invalid_date') as InvalidDateResponse;
            expect(result.isSuccess).toBe(false);
            expect(result.responseContent).toContain(
                'invalid_date is not a valid date. Please use the format: DD/MM/YY HH:MM:SS'
            );
        });

        test('should handle date in the past', () => {
            const result = reminderService.getDateAndResponseFromCommandInput(
                '01/01/21 00:00:00'
            ) as InvalidDateResponse;

            expect(result.isSuccess).toBe(false);
            expect(result.responseContent).toContain(
                '01/01/21 00:00:00 is in the past. Please choose a date in the future, using the format: DD/MM/YY HH:MM:SS'
            );
        });

        test('should handle valid date input', () => {
            const result = reminderService.getDateAndResponseFromCommandInput('01/01/99 00:00:00');

            expect(result.isSuccess).toBe(true);
            expect(result.inputDate).toEqual(new Date(2099, 0, 1));
        });
    });

    describe('addReminder', () => {
        const reminderService = new ReminderService(dateParser);

        const guildId = randomUUID();
        const channelId = randomUUID();
        const connectionUserId = randomUUID();
        const username = 'username';
        const email = 'email';
        let guildConnectionId: number;

        beforeAll(async () => {
            const guildConnection = await prisma.guildConnection.create({
                data: { guildId, connectionUserId, username, email },
            });

            guildConnectionId = guildConnection.id;
        });

        test('should add reminders successfully', async () => {
            const future = new Date();
            future.setMonth(future.getMonth() + 3);

            await reminderService.addReminder({ date: future, guildId, channelId });

            const dayReminder = new Date(future);
            dayReminder.setHours(10, 0, 0, 0);

            const hourReminder = new Date(future);
            hourReminder.setHours(future.getHours() - 1);

            const queryResults = await prisma.scheduledMessage.findMany({
                select: { guildConnectionId: true, messageContent: true, scheduledDate: true, channelId: true },
                where: { guildConnectionId },
                orderBy: { id: 'asc' },
            });

            expect(queryResults.length).toBe(2);

            expect(queryResults[0]).toStrictEqual({
                guildConnectionId,
                messageContent: `Hey @everyone 👋 don't forget we have our session today at ${time(future, 't')}`,
                scheduledDate: dayReminder,
                channelId,
            });

            expect(queryResults[1]).toStrictEqual({
                guildConnectionId,
                messageContent: `Hey @everyone 👋 Today's session will be starting in ${time(future, 'R')}`,
                scheduledDate: hourReminder,
                channelId,
            });
        });
    });
});
