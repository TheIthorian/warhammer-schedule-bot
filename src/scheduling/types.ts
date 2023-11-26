import { DayOfTheWeek } from '../constants';

export type ScheduleResponse = {
    days: DayOfTheWeek[];
    userId: string;
};

export interface PollResultsFormatter {
    format(responses: Map<String, ScheduleResponse>): string;
}
