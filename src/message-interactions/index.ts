import { SelectOptionInteraction } from './select-option';
import { MessageReactAddHandler } from './message-react-add';
import { MessageReactRemoveHandler } from './message-react-remove';
import { MessageComponentInteractionRouter } from './router';
import { pollService } from '../services/poll.service';
import { InteractionType } from 'discord.js';
import { scheduleService } from '../scheduling/schedule-service';
import { AsciiPollResultsFormatter } from '../scheduling/ascii-poll-results-formatter';
import { LinearSpamProtection } from '../spam/linear-protection';

const interactionHandlers = {
    [InteractionType.MessageComponent]: new SelectOptionInteraction(
        pollService,
        scheduleService,
        new AsciiPollResultsFormatter(),
    ),
} as const;

export const messageComponentInteractionRouter = new MessageComponentInteractionRouter(
    interactionHandlers,
    new LinearSpamProtection(0.1),
);

export const messageReactAddHandler = new MessageReactAddHandler();
export const messageReactRemoveHandler = new MessageReactRemoveHandler();
