import { Interaction } from 'discord.js';

export function getInteractionLogDetails(interaction: Interaction) {
    return {
        guild: interaction.guild?.name,
        channel: interaction.channel?.name,
        user: interaction.user.username,
    };
}
