import moment from 'moment-timezone';
import { MAX_SUGGESTIONS, formatZoneLabel, searchTimezones } from '../timezone-search';

describe('searchTimezones', () => {
    test('should return common zones for an empty query', () => {
        const results = searchTimezones('');

        expect(results).toContain('Europe/London');
        expect(results).toContain('America/New_York');
        expect(results.length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
    });

    test('should never exceed the Discord suggestion limit', () => {
        // "a" matches a very large share of the zone list.
        expect(searchTimezones('a').length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
    });

    test('should match on the city segment', () => {
        expect(searchTimezones('york')).toContain('America/New_York');
        expect(searchTimezones('tokyo')).toContain('Asia/Tokyo');
    });

    test('should be case insensitive', () => {
        expect(searchTimezones('LONDON')).toContain('Europe/London');
    });

    test('should treat spaces and hyphens as underscores', () => {
        expect(searchTimezones('new york')).toContain('America/New_York');
        expect(searchTimezones('new-york')).toContain('America/New_York');
    });

    test('should rank prefix matches above city matches', () => {
        const results = searchTimezones('europe/lon');
        expect(results[0]).toBe('Europe/London');
    });

    test('should return an empty list when nothing matches', () => {
        expect(searchTimezones('zzzznotazone')).toEqual([]);
    });

    test('should only return real zone names', () => {
        const allZones = new Set(moment.tz.names());
        for (const zone of searchTimezones('europe')) {
            expect(allZones.has(zone)).toBe(true);
        }
    });

    test('should return common zones that are all valid', () => {
        const allZones = new Set(moment.tz.names());
        for (const zone of searchTimezones('')) {
            expect(allZones.has(zone)).toBe(true);
        }
    });
});

describe('formatZoneLabel', () => {
    test('should append the current UTC offset', () => {
        expect(formatZoneLabel('UTC')).toBe('UTC (UTC+00:00)');
        expect(formatZoneLabel('Europe/London')).toMatch(/^Europe\/London \(UTC[+-]\d{2}:\d{2}\)$/);
    });

    test('should stay within the Discord 100 character choice-name limit', () => {
        for (const zone of moment.tz.names()) {
            expect(formatZoneLabel(zone).length).toBeLessThanOrEqual(100);
        }
    });
});
