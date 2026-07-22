import { MessageReaction, PartialMessageReaction, PartialUser, User } from 'discord.js';
import { logContext, makeLogger } from '../util/logger';
import { isUserAdmin } from './util';
import { UP_EMOJI_IDENTIFIER } from './constants';
import { config } from '../config';

const log = makeLogger(module);

export class MessageReactRemoveHandler {
    async execute(
        interaction: MessageReaction | PartialMessageReaction,
        reactionUser: User | PartialUser,
    ): Promise<void> {
        const ctx = logContext(
            `${MessageReactRemoveHandler.name}.${this.execute.name}`,
            { user: reactionUser.username, messageId: interaction.message.id },
            log,
        );

        const isReactionUserAdmin = isUserAdmin(reactionUser);
        if (!isReactionUserAdmin) {
            log.info(`${ctx} reaction user is not an admin`);
            return;
        }

        if (isReactionUserAdmin && (await removedReactionWasUpEmoji(interaction))) {
            log.info(`${ctx} message contains up emoji reaction. Removing all bot reactions.`);

            const message = await interaction.message.fetch();
            const reactionsByBot = message.reactions.cache.filter((reaction) =>
                reaction.users.cache.has(config.discordBotUserId),
            );

            await Promise.all(reactionsByBot.map((reaction) => reaction.users.remove()));
        }
    }
}

async function removedReactionWasUpEmoji(interaction: MessageReaction | PartialMessageReaction) {
    await interaction.fetch();
    return interaction.emoji.identifier === UP_EMOJI_IDENTIFIER;
}
