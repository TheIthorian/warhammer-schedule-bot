import { Interaction } from 'discord.js';

export function getInteractionLogDetails(interaction: Interaction) {
    return {
        guild: interaction.guild?.name,
        channel: getChannel(interaction),
        user: interaction.user.username,
    };
}

function getChannel(interaction: Interaction): string | null {
    if (!interaction.channel) {
        return null;
    }

    if (interaction.channel.isDMBased()) {
        return '(dm)';
    }

    return interaction.channel.name;
}
