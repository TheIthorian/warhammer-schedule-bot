import { PollResultsFormatter, ScheduleResponse } from './types';

export class AsciiPollResultsFormatter implements PollResultsFormatter {
    format(responses: Map<String, ScheduleResponse>): string {
        const resultArray: ScheduleResponse[] = [];
        const responseValues = responses.values();

        for (const r of responseValues) {
            resultArray.push(r);
        }

        return JSON.stringify(resultArray);
    }
}
