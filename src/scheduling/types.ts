import { DayOfTheWeek } from '../constants';

export type ScheduleResponse = {
    days: DayOfTheWeek[];
    userId: string;
};

export type ScheduleResponseWithUsername = { username: string } & ScheduleResponse;

export interface PollResultsFormatter {
    /**
     * Formats the result of a poll to a string.
     * @param responses Responses to a poll, with `userId` as key.
     */
    format(responses: Map<String, ScheduleResponse>): string;
}
