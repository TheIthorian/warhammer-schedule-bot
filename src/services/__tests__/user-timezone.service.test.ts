import { randomUUID } from 'crypto';
import { UserTimezoneService } from '../user-timezone.service';
import { DateParser } from '../../util/date-parser';
import prisma from '../../primsaClient';

describe('UserTimezoneService', () => {
    const service = new UserTimezoneService(new DateParser());

    test('should return null when the user has no stored timezone', async () => {
        expect(await service.getTimezone(randomUUID())).toBeNull();
    });

    test('should store and read back a timezone', async () => {
        const userId = randomUUID();

        expect(await service.setTimezone(userId, 'America/New_York')).toBe(true);
        expect(await service.getTimezone(userId)).toBe('America/New_York');
    });

    test('should overwrite an existing timezone', async () => {
        const userId = randomUUID();

        await service.setTimezone(userId, 'Europe/London');
        await service.setTimezone(userId, 'Asia/Tokyo');

        expect(await service.getTimezone(userId)).toBe('Asia/Tokyo');
        expect(await prisma.userTimezone.count({ where: { userId } })).toBe(1);
    });

    test('should reject an unknown timezone without writing', async () => {
        const userId = randomUUID();

        expect(await service.setTimezone(userId, 'Not/AZone')).toBe(false);
        expect(await service.getTimezone(userId)).toBeNull();
    });
});
