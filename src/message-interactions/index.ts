import { SelectOptionInteraction } from './select-option';
import { linearSpamProtection } from './../spam/index';
import { MessageComponentInteractionRouter } from './router';
import { pollService } from '../services/poll-service';
import { guildConnectionService } from '../services/guild-connection';

export const messageComponentInteractionRouter = new MessageComponentInteractionRouter(
    [new SelectOptionInteraction(pollService, guildConnectionService)],
    linearSpamProtection
);
