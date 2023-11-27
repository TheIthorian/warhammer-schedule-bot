import { config } from '../config';
import { logContext, makeLogger } from '../util/logger';

const log = makeLogger(module);

export class QueryService {
    constructor(private readonly url: string, private readonly api: string) {}

    async runQuery(queryInput: string): Promise<{ responseContent: string; ephemeral: boolean }> {
        const ctx = logContext(`${QueryService.name}.${this.runQuery.name}`, { queryInput });

        const url = `${this.url}/query/${queryInput}`;
        log.info(`${ctx} calling query at "${url}"`);

        const response = await fetch(url, { headers: { api: this.api } });

        if (!response.ok) {
            log.error(`${ctx} error fetching response`, await response.text());
            return {
                responseContent: 'There was an error generating your response. Please try again later.',
                ephemeral: true,
            };
        }

        const queryResponseText = await response.text();
        return { responseContent: this.formatQueryResponse(queryInput, queryResponseText), ephemeral: false };
    }

    private formatQueryResponse(questionInput: string, queryResponse: string): string {
        const shortenedResponse = queryResponse.substring(0, 1900) + (queryResponse.length > 1900 ? '...' : '');
        return `Q: ${questionInput}\n\nA: ${shortenedResponse}`;
    }
}

export const queryService = new QueryService(config.aiService.url, config.aiService.apiKey);
