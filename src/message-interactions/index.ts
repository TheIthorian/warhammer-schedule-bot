import { SelectOptionInteraction } from './select-option';
import { linearSpamProtection } from './../spam/index';
import { MessageComponentInteractionRouter } from './router';
import { pollService } from '../services/poll-service';
import { guildConnectionService } from '../services/guild-connection';
import { InteractionType } from 'discord.js';
import { scheduleService } from '../scheduling/schedule-service';
import { AsciiPollResultsFormatter } from '../scheduling/ascii-poll-results-formatter';

const interactionHandlers = {
    [InteractionType.MessageComponent]: new SelectOptionInteraction(
        pollService,
        guildConnectionService,
        scheduleService,
        new AsciiPollResultsFormatter()
    ),
} as const;

export const messageComponentInteractionRouter = new MessageComponentInteractionRouter(
    interactionHandlers,
    linearSpamProtection
);
