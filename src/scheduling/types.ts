export type ScheduleResponse = {
    days: string[];
    userId: string;
    responseTime: number;
};

export interface PollResultsFormatter {
    format(responses: Map<String, ScheduleResponse>): string;
}
