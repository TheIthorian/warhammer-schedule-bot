import { randomUUID } from 'crypto';
import { PartyScheduler } from '../party-scheduler';

describe('PartyScheduler', () => {
    const guildId = randomUUID();
    const messageId = 'message:1';
    const messageUrl = 'message_url:1';

    describe('addSchedulingMessage', () => {
        it('should start scheduling', () => {
            const partyScheduler = new PartyScheduler();

            partyScheduler.addSchedulingMessage(guildId, messageId, messageUrl);

            expect(partyScheduler.isExistScheduleInProgress(guildId)).toBe(true);
            expect(partyScheduler.getInProgressSchedule(guildId)).toStrictEqual({
                messageId,
                messageUrl,
                responses: new Map(),
            });
        });

        it('should throw error if scheduling has already started', () => {
            const partyScheduler = new PartyScheduler();

            const messageId2 = 'message:2';
            const messageUrl2 = 'message_url:2';

            partyScheduler.addSchedulingMessage(guildId, messageId, messageUrl);
            expect(() => partyScheduler.addSchedulingMessage(guildId, messageId2, messageUrl2)).toThrow(
                'A scheduling is already in progress'
            );
        });
    });

    describe('addResponse', () => {
        const partyScheduler = new PartyScheduler();

        it('should add a user response', () => {
            const days = ['Monday'];
            const userId = 'user:1';
            const responseTime = new Date().getTime();

            partyScheduler.addSchedulingMessage(guildId, messageId, messageUrl);
            partyScheduler.addResponse(guildId, { days, userId, responseTime });

            expect(partyScheduler.getInProgressSchedule(guildId).responses.get(userId)).toStrictEqual({
                userId,
                days,
                responseTime,
            });
        });

        it('should override user response', () => {
            const days = ['Tuesday'];
            const userId = 'user:1';
            const responseTime = new Date().getTime();

            partyScheduler.addResponse(guildId, { days, userId, responseTime });

            expect(partyScheduler.getInProgressSchedule(guildId).responses.get(userId)).toStrictEqual({
                userId,
                days,
                responseTime,
            });
        });

        it('should throw error if scheduling has not started', () => {
            expect(() =>
                partyScheduler.addResponse(randomUUID(), { days: [], userId: 1, responseTime: new Date().getTime() })
            ).toThrow('Cannot add response as no scheduling is in progress');
        });
    });

    describe('hasEveryoneResponded', () => {
        const days = ['Monday'];
        const userId = 'user:1';
        const responseTime = new Date().getTime();

        it('should return false when there are more members than responders', () => {
            const partyScheduler = new PartyScheduler();

            partyScheduler.addSchedulingMessage(guildId, messageId, messageUrl);
            partyScheduler.addResponse(guildId, { days, userId, responseTime });

            expect(partyScheduler.hasEveryoneResponded(guildId, 3)).toBe(false);
        });

        it('should return true when there are as many members as responders', () => {
            const partyScheduler = new PartyScheduler();

            partyScheduler.addSchedulingMessage(guildId, messageId, messageUrl);
            partyScheduler.addResponse(guildId, { days, userId, responseTime });
            partyScheduler.addResponse(guildId, { days, userId: 'user:2', responseTime });

            expect(partyScheduler.hasEveryoneResponded(guildId, 3)).toBe(true);
        });
    });
});
