import { MessageReaction, PartialMessageReaction, PartialUser, User } from 'discord.js';
import { logContext, makeLogger } from '../util/logger';
import { isUserAdmin } from './util';
import { UP_EMOJI_IDENTIFIER } from './constants';
import { config } from '../config';

const log = makeLogger(module);

export class MessageReactAddHandler {
    async execute(
        interaction: MessageReaction | PartialMessageReaction,
        reactionUser: User | PartialUser
    ): Promise<void> {
        const ctx = logContext(
            `${MessageReactAddHandler.name}.${this.execute.name}`,
            { user: reactionUser.username, messageId: interaction.message.id },
            log
        );

        if (!isUserAdmin(reactionUser)) {
            log.info(`${ctx} reaction is not from admin`);
            return;
        }

        if (reactionIsUpEmoji(interaction)) {
            log.info(`${ctx} reaction is up emoji from admin`);
            await copyAdminReactions(interaction, reactionUser);
            return;
        }

        if (await messageContainsUpEmoji(interaction)) {
            log.info(`${ctx} reaction has admin user in and message contains up emoji reaction. Copying reaction.`);
            await interaction.react();
        }
    }
}

function reactionIsUpEmoji(interaction: MessageReaction | PartialMessageReaction) {
    return interaction.emoji.identifier === UP_EMOJI_IDENTIFIER;
}

async function copyAdminReactions(
    interaction: MessageReaction | PartialMessageReaction,
    reactionUser: User | PartialUser
) {
    await Promise.all(
        interaction.message.reactions.cache.map(async reaction => {
            const users = await reaction.users.fetch();
            if (users.some(user => user.id === reactionUser.id)) {
                reaction.react();
            }
        })
    );
}

async function messageContainsUpEmoji(interaction: MessageReaction | PartialMessageReaction) {
    log.info(`Checking if message contains up emoji`);

    const allUpEmojiReactions = interaction.message.reactions.cache.filter(
        reaction => reaction.emoji.identifier === UP_EMOJI_IDENTIFIER
    );

    for (const adminUserId of config.adminUsers) {
        for (const upEmojiReaction of allUpEmojiReactions) {
            const users = upEmojiReaction[1].users.cache;

            console.log(`${messageContainsUpEmoji.name}`, {
                adminUserId,
                users: users.map(user => user.id),
                emoji: upEmojiReaction[1].emoji,
            });

            if (users.some(user => user.id === adminUserId)) return true;
        }
    }

    return false;
}
