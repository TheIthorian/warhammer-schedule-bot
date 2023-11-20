import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from './types';
import { getInteractionLogDetails } from '../util/interaction-info';
import { logContext, makeLogger } from '../util/logger';

const log = makeLogger(module);

export class RollCommand implements Command {
    public readonly data: SlashCommandBuilder;

    constructor() {
        this.data = new SlashCommandBuilder()
            .setName('roll')
            .setDescription('Roll a dice')
            .addStringOption(option => option.setName('dice').setDescription('Dice to roll E.g. 2d10'))
            .setName('roll');
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
        const ctx = logContext(`${RollCommand.name}.${this.execute.name}`, getInteractionLogDetails(interaction), log);

        const stringInput = interaction.options.getString('dice')?.toLocaleLowerCase().trim() ?? '1d20';
        const [numberOfRolls, sides] = stringInput.split('d');

        if (!numberOfRolls || !sides || isNaN(Number(numberOfRolls)) || isNaN(Number(sides))) {
            log.debug(`${ctx} invalid dice input`);
            await interaction.reply({
                content: `Invalid dice roll. Please input dice with the format like 1d10`,
                ephemeral: true,
            });
            return;
        }

        const numbers = new Array<number>(Math.min(Number(numberOfRolls), 10))
            .fill(0)
            .map(() => Math.floor(Math.random() * Number(sides)));

        const sum = numbers.reduce<number>((total, curr) => total + curr, 0);
        const average = (sum / numbers.length).toFixed(1);
        const resultList = numbers.map(n => '## ' + n);

        const subtext = numbers.length > 1 ? `\nsum: ${sum}; average: ${average}` : '';

        await interaction.reply({
            content: `${interaction.user} rolled ${stringInput}
${resultList.join('\n')}${subtext}`,
            ephemeral: false,
        });
    }
}
