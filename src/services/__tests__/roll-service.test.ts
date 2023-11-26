import { FailedRollParseResult, RollService, SuccessfulRollParseResult } from '../roll-service';

describe('RollService', () => {
    let rollService: RollService;

    beforeEach(() => {
        rollService = new RollService();
    });

    describe('parseRollInput', () => {
        test('should return success and valid options for valid input', () => {
            const result = rollService.parseRollInput('2d6') as SuccessfulRollParseResult;

            expect(result.isSuccess).toBe(true);
            expect(result.options).toEqual({ rolls: 2, sides: 6 });
        });

        test('should handle undefined input and default to 1d20', () => {
            const result = rollService.parseRollInput() as SuccessfulRollParseResult;
            expect(result.isSuccess).toBe(true);
            expect(result.options).toEqual({ rolls: 1, sides: 20 });
        });

        test('should return failure for invalid input', () => {
            const result = rollService.parseRollInput('invalidInput') as FailedRollParseResult;
            expect(result.isSuccess).toBe(false);
            expect(result.message).toBe('Invalid dice roll. Please input dice with the format like 1d10');
        });

        test('should return failure for invalid input', () => {
            const result = rollService.parseRollInput('ad20') as FailedRollParseResult;
            expect(result.isSuccess).toBe(false);
            expect(result.message).toBe('Invalid dice roll. Please input dice with the format like 1d10');
        });
    });

    describe('generateValues', () => {
        test('should generate valid values for given options', () => {
            const options = { rolls: 2, sides: 6 };
            const result = rollService.generateValues(options);

            expect(result.numbers.length).toBe(2);
            expect(result.sum).toBeGreaterThanOrEqual(1);
            expect(result.average).toBeGreaterThanOrEqual(1);
        });

        test('should have 1 as the min roll values', () => {
            const options = { rolls: 1, sides: 1 };
            const result = rollService.generateValues(options);

            expect(result.numbers.length).toBe(1);
            expect(result.sum).toBe(1);
            expect(result.average).toBe(1);
        });

        test('should not produce more than 10 values', () => {
            const options = { rolls: 20, sides: 10 };
            const result = rollService.generateValues(options);

            expect(result.numbers.length).toBe(10);
        });
    });

    describe('formatValues', () => {
        test('should format values correctly', () => {
            const values = { numbers: [1, 2, 2], sum: 5, average: 1.6666 };
            const result = rollService.formatValues(values);
            expect(result).toMatchSnapshot();
        });

        test('should handle single value and omit average in formatting', () => {
            const values = { numbers: [5], sum: 5, average: 5 };
            const result = rollService.formatValues(values);
            expect(result).toMatchSnapshot();
        });
    });
});
