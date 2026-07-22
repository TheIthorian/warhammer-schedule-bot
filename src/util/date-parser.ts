import moment from 'moment';

export class DateParser {
    parse(input: string, utcOffset = 0): Date {
        return moment(input).utcOffset(utcOffset).toDate();
    }

    parseNative(input: string): Date {
        const [date, time] = input.split(' ');

        const dateDelimiter = date.includes('/') ? '/' : '-';
        const [day, month, year] = date?.split(dateDelimiter) ?? [];
        const [hour, minute] = time?.split(':') ?? [];

        const yearNum = Number(year);
        return new Date(
            yearNum < 2000 ? 2000 + yearNum : yearNum,
            Number(month) - 1,
            Number(day),
            Number(hour ?? 0),
            Number(minute ?? 0),
        );
    }
}
