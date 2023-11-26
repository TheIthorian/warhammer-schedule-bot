import { DayOfTheWeek } from '../../constants';
import { AsciiPollResultsFormatter, extractResponses, transposeResponses } from '../ascii-poll-results-formatter';
import { ScheduleResponse } from '../types';

describe('AsciiPollResultsFormatter', () => {
    const formatter = new AsciiPollResultsFormatter();
    const responses = new Map<string, ScheduleResponse>();
    responses.set('user:1', {
        days: ['Monday', 'Tuesday'],
        userId: 'user:1',
    });

    responses.set('user:2', {
        days: ['Tuesday', 'Wednesday'],
        userId: 'user:2',
    });

    test('getResults method returns the sorted results', () => {
        const sortedResults = formatter.getResults(responses);

        const expected: Array<{ day: DayOfTheWeek; userIds: string[] }> = [
            { day: 'Tuesday', userIds: ['user:1', 'user:2'] },
            { day: 'Monday', userIds: ['user:1'] },
            { day: 'Wednesday', userIds: ['user:2'] },
            { day: 'Friday', userIds: [] },
            { day: 'Saturday', userIds: [] },
            { day: 'Sunday', userIds: [] },
            { day: 'Thursday', userIds: [] },
        ];

        expect(sortedResults).toStrictEqual(expected);
    });

    test('format method returns a formatted string of the results', () => {
        const formattedResult = formatter.format(responses);

        expect(formattedResult).toMatchSnapshot();
    });
});

describe('extractResponses', () => {
    const responseTime = new Date().getTime();

    test('extractResponses returns an array of ScheduleResponse', () => {
        const responses = new Map<string, ScheduleResponse>();
        responses.set('user:1', {
            days: ['Monday', 'Tuesday'],
            userId: 'user:1',
        });

        const resultArray = extractResponses(responses);

        expect(resultArray).toStrictEqual([{ days: ['Monday', 'Tuesday'], userId: 'user:1' }]);
    });
});

describe('transposeResponses', () => {
    test('transposeResponses returns an object with days as keys', () => {
        const responses: ScheduleResponse[] = [
            { days: ['Monday', 'Tuesday'], userId: 'user:1' },
            { days: ['Tuesday', 'Wednesday'], userId: 'user:2' },
        ];

        const transposedResults = transposeResponses(responses);

        const expected: Record<DayOfTheWeek, string[]> = {
            Monday: ['user:1'],
            Tuesday: ['user:1', 'user:2'],
            Wednesday: ['user:2'],
            Thursday: [],
            Friday: [],
            Saturday: [],
            Sunday: [],
        };

        expect(transposedResults).toStrictEqual(expected);
    });
});
