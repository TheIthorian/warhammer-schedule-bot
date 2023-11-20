import { DayOfTheWeek } from '../constants';

export type ScheduleResponse = {
    days: DayOfTheWeek[];
    userId: string;
    responseTime: number;
};

export interface PollResultsFormatter {
    format(responses: Map<String, ScheduleResponse>): string;
}
