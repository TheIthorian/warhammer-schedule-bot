import { QueryService } from '../query.service';

describe('QueryService', () => {
    const apiUrl = 'http://example.com';
    const apiKey = 'your-api-key';
    const queryService = new QueryService(apiUrl, apiKey);

    beforeEach(() => {
        jest.resetAllMocks();
        global.fetch = jest.fn();
    });

    it('should make a successful query', async () => {
        const queryInput = 'exampleQuery';
        const mockResponse = {
            ok: true,
            text: jest.fn().mockResolvedValue('Mocked response content'),
        };

        fetch.mockResolvedValue(mockResponse);

        const result = await queryService.runQuery(queryInput);

        expect(fetch).toHaveBeenCalledWith(apiUrl, {
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            method: 'POST',
            body: JSON.stringify({
                query: queryInput,
                rerank: true,
                filter: { scope: 'prod' },
                msg: '',
            }),
        });

        expect(result).toEqual({
            content: 'Q: exampleQuery\n\nA: Mocked response content',
            ephemeral: false,
        });
    });

    it('should handle an error in the query response', async () => {
        const queryInput = 'exampleQuery';
        const mockResponse = {
            ok: false,
            text: jest.fn().mockResolvedValue('Error message'),
        };

        fetch.mockResolvedValue(mockResponse);

        const result = await queryService.runQuery(queryInput);

        expect(fetch).toHaveBeenCalledWith(apiUrl, {
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            method: 'POST',
            body: JSON.stringify({
                query: queryInput,
                rerank: true,
                filter: { scope: 'prod' },
                msg: '',
            }),
        });

        expect(result).toEqual({
            content: 'There was an error generating your response. Please try again later.',
            ephemeral: true,
        });
    });

    it('should shorten a response to 1900 characters', async () => {
        const queryInput = 'exampleQuery';
        const mockResponse = {
            ok: true,
            text: jest.fn().mockResolvedValue(new Array(2000).fill('X').join('')),
        };

        fetch.mockResolvedValue(mockResponse);

        const result = await queryService.runQuery(queryInput);

        expect(fetch).toHaveBeenCalledWith(`${apiUrl}/query/${queryInput}`, {
            headers: { api: apiKey },
        });

        expect(result.content).toMatchSnapshot();
        expect(result.ephemeral).toBe(false);
    });
});
