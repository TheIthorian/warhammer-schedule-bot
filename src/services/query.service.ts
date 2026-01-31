import { config } from '../config';
import { logContext, makeLogger } from '../util/logger';

const log = makeLogger(module);

export class QueryService {
    constructor(private readonly url: string, private readonly api: string) {}

    async runQuery(query?: string): Promise<{ content: string; ephemeral: boolean }> {
        const ctx = logContext(`${QueryService.name}.${this.runQuery.name}`, { query, url: this.url });

        if (!query) {
            log.info(`${ctx} No input provided`);
            return { content: 'Please provide an input', ephemeral: true };
        }

        const response = await fetch(this.url, {
            headers: { Authorization: `Bearer ${this.api}`, 'Content-Type': 'application/json' },
            method: 'POST',
            body: JSON.stringify({
                query,
                rerank: true,
                filter: { scope: 'prod' },
                msg: '',
            }),
        });

        if (!response.ok) {
            log.error({ responseText: await response.text() }, `${ctx} error fetching response`);
            return {
                content: 'There was an error generating your response. Please try again later.',
                ephemeral: true,
            };
        }

        const queryResponse: { generation: string } = await response.json();
        log.debug(`${ctx} received response of length: ${queryResponse.generation.length}`);
        return { content: this.formatQueryResponse(query, queryResponse.generation), ephemeral: false };
    }

    private formatQueryResponse(questionInput: string, queryResponse: string): string {
        const shortenedResponse = queryResponse.substring(0, 1900) + (queryResponse.length > 1900 ? '...' : '');
        return `Q: ${questionInput}\n\nA: ${shortenedResponse}`;
    }
}

export const queryService = new QueryService(config.aiService.url, config.aiService.apiKey);
