import moment from 'moment-timezone';

// Accepted input shapes, all day-first. Without an explicit zone these would be resolved against the host's
// timezone, which on Railway is UTC — that is how `/book` used to silently shift every booking.
const INPUT_FORMATS = ['DD/MM/YYYY HH:mm:ss', 'DD/MM/YYYY HH:mm', 'DD/MM/YYYY'];

export class DateParser {
    parse(input: string, utcOffset = 0): Date {
        return moment(input).utcOffset(utcOffset).toDate();
    }

    /** Resolves a day-first date string to an instant, reading the wall-clock time as local to `timezone`. */
    parseNative(input: string, timezone: string): Date {
        if (!this.isValidTimezone(timezone)) {
            return new Date(NaN);
        }

        // Normalise the delimiter so a single format list covers both `25/12/26` and `25-12-26`.
        const normalised = this.expandTwoDigitYear(input.trim().replace(/-/g, '/'));

        return moment.tz(normalised, INPUT_FORMATS, true, timezone).toDate();
    }

    /**
     * Rewrites `DD/MM/YY` to `DD/MM/20YY`. This bot books future sessions, so a two-digit year always means the
     * 2000s — moment's own pivot would read `99` as 1999 and reject the booking as being in the past.
     */
    private expandTwoDigitYear(input: string): string {
        return input.replace(
            /^(\d{1,2}\/\d{1,2}\/)(\d{2})(?!\d)/,
            (_match, prefix: string, year: string) => `${prefix}20${year}`,
        );
    }

    isValidTimezone(timezone: string): boolean {
        return Boolean(timezone) && moment.tz.zone(timezone) !== null;
    }
}
