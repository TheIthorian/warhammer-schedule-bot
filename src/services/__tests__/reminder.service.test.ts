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
            const result = reminderService.getDateAndResponseFromCommandInput(
                'invalid_date',
                'Europe/London',
            ) as InvalidDateResponse;
            expect(result.isSuccess).toBe(false);
            expect(result.responseContent).toContain(
                'invalid_date is not a valid date. Please use the format: DD/MM/YY HH:MM:SS',
            );
        });

        test('should handle date in the past', () => {
            const result = reminderService.getDateAndResponseFromCommandInput(
                '01/01/21 00:00:00',
                'Europe/London',
            ) as InvalidDateResponse;

            expect(result.isSuccess).toBe(false);
            expect(result.responseContent).toContain(
                '01/01/21 00:00:00 is in the past. Please choose a date in the future, using the format: DD/MM/YY HH:MM:SS',
            );
        });

        test('should handle valid date input', () => {
            const result = reminderService.getDateAndResponseFromCommandInput('01/01/99 00:00:00', 'Europe/London');

            expect(result.isSuccess).toBe(true);
            expect(result.inputDate.toISOString()).toBe('2099-01-01T00:00:00.000Z');
        });

        test('should resolve the same wall-clock input differently per timezone', () => {
            const london = reminderService.getDateAndResponseFromCommandInput('25/12/99 19:00', 'Europe/London');
            const newYork = reminderService.getDateAndResponseFromCommandInput('25/12/99 19:00', 'America/New_York');

            expect(london.isSuccess).toBe(true);
            expect(newYork.isSuccess).toBe(true);
            expect(london.inputDate.toISOString()).toBe('2099-12-25T19:00:00.000Z');
            expect(newYork.inputDate.toISOString()).toBe('2099-12-26T00:00:00.000Z');
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

        test('should schedule the day reminder at 10am in the booker timezone', async () => {
            // 20:00 in New York on a winter evening: 2099-01-15T01:00:00Z the next UTC day.
            const sessionDate = new Date('2099-01-15T01:00:00.000Z');

            await reminderService.addReminder({
                date: sessionDate,
                guildConnectionId,
                channelId,
                timezone: 'America/New_York',
            });

            const queryResults = await prisma.scheduledMessage.findMany({
                select: { scheduledDate: true },
                where: { guildConnectionId },
                orderBy: { id: 'asc' },
            });

            expect(queryResults.length).toBe(2);

            // The session is on 14 Jan *locally* in New York, so 10am local that day is 15:00Z.
            expect(queryResults[0]?.scheduledDate.toISOString()).toBe('2099-01-14T15:00:00.000Z');

            // One hour before the session, in absolute terms.
            expect(queryResults[1]?.scheduledDate.toISOString()).toBe('2099-01-15T00:00:00.000Z');
        });

        test('should add reminders with the expected content', async () => {
            const otherChannelId = randomUUID();
            const sessionDate = new Date('2099-06-20T18:00:00.000Z');

            await reminderService.addReminder({
                date: sessionDate,
                guildConnectionId,
                channelId: otherChannelId,
                timezone: 'Europe/London',
            });

            const queryResults = await prisma.scheduledMessage.findMany({
                select: { guildConnectionId: true, messageContent: true, scheduledDate: true, channelId: true },
                where: { guildConnectionId, channelId: otherChannelId },
                orderBy: { id: 'asc' },
            });

            expect(queryResults.length).toBe(2);

            expect(queryResults[0]).toStrictEqual({
                guildConnectionId,
                messageContent: `Hey @everyone 👋 don't forget we have our session today at ${time(sessionDate, 't')}`,
                // 20 June is BST, so 10am local is 09:00Z.
                scheduledDate: new Date('2099-06-20T09:00:00.000Z'),
                channelId: otherChannelId,
            });

            expect(queryResults[1]).toStrictEqual({
                guildConnectionId,
                messageContent: `Hey @everyone 👋 Today's session will be starting in ${time(sessionDate, 'R')}`,
                scheduledDate: new Date('2099-06-20T17:00:00.000Z'),
                channelId: otherChannelId,
            });
        });
    });
});
