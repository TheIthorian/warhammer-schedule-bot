import { padString } from '../util/string';
import { DAYS_OF_THE_WEEK, DayOfTheWeek } from '../constants';
import { PollResultsFormatter, ScheduleResponse } from './types';

const GRAPHIC_WIDTH = 20;

const lengthOfLongestDayName = DAYS_OF_THE_WEEK.reduce((prev, curr) => Math.max(prev, curr.length), 0);

export class AsciiPollResultsFormatter implements PollResultsFormatter {
    format(responses: Map<String, ScheduleResponse>): string {
        const results = this.getResults(responses);

        const totalNumberOfResponses = responses.size;
        const formattedResultsArray = results.map((result) => {
            const fractionOfMax = (GRAPHIC_WIDTH * result.userIds.length) / totalNumberOfResponses;
            const recordString = `(${result.userIds.length})\t${padString(result.day, lengthOfLongestDayName)}\t`;
            const barString = '|' + padString(padString('', fractionOfMax, '█'), GRAPHIC_WIDTH) + '|';
            return recordString + barString;
        });

        return '```md\n' + formattedResultsArray.join('\n') + '```';
    }

    getResults(responses: Map<String, ScheduleResponse>) {
        const resultArray = extractResponses(responses);
        const transposedResults = transposeResponses(resultArray);

        const results: Array<{ day: DayOfTheWeek; userIds: string[] }> = [];
        for (const [day, userIds] of Object.entries(transposedResults)) {
            results.push({ day: day as DayOfTheWeek, userIds });
        }

        return results.sort((a, b) => a.day.localeCompare(b.day)).sort((a, b) => b.userIds.length - a.userIds.length);
    }
}

export function extractResponses(responses: Map<String, ScheduleResponse>): ScheduleResponse[] {
    const resultArray: ScheduleResponse[] = [];
    const responseValues = responses.values();

    for (const r of responseValues) {
        resultArray.push(r);
    }

    return resultArray;
}

export function transposeResponses(responses: ScheduleResponse[]): Record<DayOfTheWeek, string[]> {
    const responsesByDays = DAYS_OF_THE_WEEK.reduce((prev, day) => {
        prev[day] = [];
        return prev;
    }, {}) as Record<DayOfTheWeek, string[]>;

    for (const response of responses) {
        for (const day of response.days) {
            responsesByDays[day].push(response.userId);
        }
    }

    return responsesByDays;
}
