import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from './types';
import { getInteractionLogDetails } from '../util/interaction-info';
import { logContext, makeLogger } from '../util/logger';
import { RollService } from '../services/roll.service';

const log = makeLogger(module);

export class RollCommand implements Command {
    public readonly data: SlashCommandBuilder;

    constructor(private readonly rollService: RollService) {
        this.data = new SlashCommandBuilder()
            .setName('roll')
            .setDescription('Roll a dice')
            .addStringOption(option => option.setName('dice').setDescription('Dice to roll E.g. 2d10'))
            .setName('roll');
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
        const ctx = logContext(`${RollCommand.name}.${this.execute.name}`, getInteractionLogDetails(interaction), log);

        const stringInput = interaction.options.getString('dice');
        const parsedInputResult = this.rollService.parseRollInput(stringInput);

        if (parsedInputResult.isSuccess === false) {
            log.debug(`${ctx} invalid dice input`);
            await interaction.reply({ content: parsedInputResult.message, ephemeral: true });
            return;
        }

        const rolls = this.rollService.generateValues(parsedInputResult.options);
        const resultingInputString = `${parsedInputResult.options.rolls}d${parsedInputResult.options.sides}`;
        const content = `${interaction.user} rolled ${resultingInputString}\n${this.rollService.formatValues(rolls)}`;

        await interaction.reply({ content, ephemeral: false });
    }
}
