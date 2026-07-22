import { DateParser } from '../date-parser';

describe('DateParser', () => {
    const dateParser = new DateParser();

    describe('parseNative', () => {
        test('should interpret the input in the given timezone, not the host timezone', () => {
            // 19:00 in London on a winter date is 19:00 UTC.
            const london = dateParser.parseNative('25/12/26 19:00', 'Europe/London');
            expect(london.toISOString()).toBe('2026-12-25T19:00:00.000Z');

            // The same wall-clock input in New York is five hours later in absolute terms.
            const newYork = dateParser.parseNative('25/12/26 19:00', 'America/New_York');
            expect(newYork.toISOString()).toBe('2026-12-26T00:00:00.000Z');
        });

        test('should respect daylight saving time for the zone', () => {
            // British Summer Time: London is UTC+1 in July.
            const summer = dateParser.parseNative('15/07/26 19:00', 'Europe/London');
            expect(summer.toISOString()).toBe('2026-07-15T18:00:00.000Z');
        });

        test('should default the time to midnight in the given zone when omitted', () => {
            const result = dateParser.parseNative('25/12/26', 'Europe/London');
            expect(result.toISOString()).toBe('2026-12-25T00:00:00.000Z');
        });

        test('should support both / and - as date delimiters', () => {
            const slash = dateParser.parseNative('25/12/26 19:00', 'Europe/London');
            const dash = dateParser.parseNative('25-12-26 19:00', 'Europe/London');
            expect(dash.toISOString()).toBe(slash.toISOString());
        });

        test('should return an invalid date for unparseable input', () => {
            const result = dateParser.parseNative('invalid_date', 'Europe/London');
            expect(isNaN(result.getTime())).toBe(true);
        });

        test('should return an invalid date for an unknown timezone', () => {
            const result = dateParser.parseNative('25/12/26 19:00', 'Not/AZone');
            expect(isNaN(result.getTime())).toBe(true);
        });
    });

    describe('isValidTimezone', () => {
        test('should accept IANA zone names', () => {
            expect(dateParser.isValidTimezone('Europe/London')).toBe(true);
            expect(dateParser.isValidTimezone('America/New_York')).toBe(true);
        });

        test('should reject unknown zone names', () => {
            expect(dateParser.isValidTimezone('Not/AZone')).toBe(false);
            expect(dateParser.isValidTimezone('GMT+1')).toBe(false);
            expect(dateParser.isValidTimezone('')).toBe(false);
        });
    });
});
