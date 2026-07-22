import moment from 'moment-timezone';

/** Discord allows at most 25 autocomplete suggestions per response. */
export const MAX_SUGGESTIONS = 25;

/** Shown before the user has typed anything. Ordered by how likely this bot's players are to want them. */
const COMMON_ZONES = [
    'Europe/London',
    'Europe/Dublin',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Madrid',
    'Europe/Rome',
    'Europe/Amsterdam',
    'Europe/Stockholm',
    'Europe/Warsaw',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'America/Vancouver',
    'America/Sao_Paulo',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Australia/Perth',
    'Pacific/Auckland',
    'Asia/Tokyo',
    'Asia/Singapore',
    'Asia/Kolkata',
    'Asia/Dubai',
    'UTC',
];

/**
 * Filters IANA zone names for an autocomplete dropdown. Matches on the whole name and on the city segment, so
 * "york" finds America/New_York; prefix matches rank above mid-string ones.
 */
export function searchTimezones(query: string, zoneNames: Array<string> = moment.tz.names()): Array<string> {
    const trimmed = query.trim().toLowerCase();

    if (trimmed === '') {
        return COMMON_ZONES.slice(0, MAX_SUGGESTIONS);
    }

    // Let users type a space or hyphen where the zone name uses an underscore.
    const needle = trimmed.replace(/[\s-]/g, '_');

    const prefixMatches: Array<string> = [];
    const cityMatches: Array<string> = [];
    const substringMatches: Array<string> = [];

    for (const zone of zoneNames) {
        const haystack = zone.toLowerCase();

        if (haystack.startsWith(needle)) {
            prefixMatches.push(zone);
            continue;
        }

        const city = haystack.slice(haystack.lastIndexOf('/') + 1);
        if (city.startsWith(needle)) {
            cityMatches.push(zone);
            continue;
        }

        if (haystack.includes(needle)) {
            substringMatches.push(zone);
        }
    }

    return [...prefixMatches, ...cityMatches, ...substringMatches].slice(0, MAX_SUGGESTIONS);
}

/** Renders a zone with its current UTC offset, so the user can sanity-check their pick. */
export function formatZoneLabel(zone: string): string {
    const label = `${zone} (UTC${moment.tz(zone).format('Z')})`;

    // Discord rejects choice names longer than 100 characters.
    return label.length > 100 ? zone.slice(0, 100) : label;
}
