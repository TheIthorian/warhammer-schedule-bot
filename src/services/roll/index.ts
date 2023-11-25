import { logContext, makeLogger } from '../../util/logger';

const log = makeLogger(module);

type ParseRollOutput = SuccessfulRollParseResult | FailedRollParseResult;
export type SuccessfulRollParseResult = { isSuccess: true; options: RollOptions };
export type FailedRollParseResult = { isSuccess: false; message: string };

type RollOptions = { rolls: number; sides: number };

type RollResult = { numbers: number[]; average: number; sum: number };

export class RollService {
    public parseRollInput(input?: string): ParseRollOutput {
        const ctx = logContext(`${this.parseRollInput.name}`, { input: input ?? '(undefined)' }, log);

        const stringInput = input?.toLocaleLowerCase().trim() ?? '1d20';

        const [rollsString, sidesString] = stringInput.split('d');
        const [rolls, sides] = [Number(rollsString), Number(sidesString)];

        if (isNaN(rolls) || isNaN(sides)) {
            log.debug(`${ctx} invalid dice input`);
            return { message: `Invalid dice roll. Please input dice with the format like 1d10`, isSuccess: false };
        }

        return { isSuccess: true, options: { rolls, sides } };
    }

    public generateValues({ rolls, sides }: RollOptions): RollResult {
        const numbers = new Array<number>(Math.min(rolls, 10)).fill(0).map(() => Math.floor(Math.random() * sides + 1));

        const sum = numbers.reduce<number>((total, curr) => total + curr, 0);
        const average = sum / numbers.length;

        return { sum, average, numbers };
    }

    public formatValues({ numbers, sum, average }: RollResult): string {
        const resultList = numbers.map(n => '## ' + n);

        const subtext = numbers.length > 1 ? `\nsum: ${sum}; average: ${average.toFixed(1)}` : '';

        return `${resultList.join('\n')}${subtext}`;
    }
}
