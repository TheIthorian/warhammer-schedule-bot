import { config } from '../config';
import { logContext, makeLogger } from '../util/logger';

const log = makeLogger(module);

function isQueryResponse(value: unknown): value is { generation: string } {
    if (typeof value !== 'object' || value === null) return false;
    if (!('generation' in value)) return false;
    return typeof value.generation === 'string';
}

export class QueryService {
    constructor(
        private readonly url: string | undefined,
        private readonly api: string | undefined,
    ) {}

    async runQuery(query?: string): Promise<{ content: string; ephemeral: boolean }> {
        const ctx = logContext(`${QueryService.name}.${this.runQuery.name}`, { query, url: this.url });

        if (!query) {
            log.info(`${ctx} No input provided`);
            return { content: 'Please provide an input', ephemeral: true };
        }

        if (!this.url) {
            log.error(`${ctx} AI service URL is not configured`);
            return { content: 'The AI service is not configured.', ephemeral: true };
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

        const queryResponse: unknown = await response.json();

        if (!isQueryResponse(queryResponse)) {
            log.error({ queryResponse }, `${ctx} response body did not contain a string 'generation' field`);
            return {
                content: 'There was an error generating your response. Please try again later.',
                ephemeral: true,
            };
        }

        log.debug(`${ctx} received response of length: ${queryResponse.generation.length}`);
        return { content: this.formatQueryResponse(query, queryResponse.generation), ephemeral: false };
    }

    private formatQueryResponse(questionInput: string, queryResponse: string): string {
        const shortenedResponse = queryResponse.substring(0, 1900) + (queryResponse.length > 1900 ? '...' : '');
        return `Q: ${questionInput}\n\nA: ${shortenedResponse}`;
    }
}

export const queryService = new QueryService(config.aiService.url, config.aiService.apiKey);
